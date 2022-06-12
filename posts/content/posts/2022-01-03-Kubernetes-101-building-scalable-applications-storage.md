---
title: "Kubernetes 101: Building Scalable Applications - Storage"
date: 2022-01-03
url: /kubernetes-101-building-scalable-applications-storage
toc: false
draft: false
images:
  - /img/kubernetes.png
tags:
  - Containers
  - Docker
  - Kubernetes
  - Storage
  - Pod 
  - Persistent Volume
  - Persistent Volume Claim
  - StorageClass
---

{{<figure class="center" src="/img/kubernetes.png" alt="Kubernetes logo" width="200px">}}


## Storage Options
Files stored in a container will only live as long as the container itself: they are ephemeral. To solve this problem we can use `Pod Volumes`, they outlive containers and stay available during the Pod lifetime. The Pod Volume is a property of the Pod, not the container.  

Pod Volumes can directly bind to any specific [storage type](https://kubernetes.io/docs/concepts/storage/volumes/#volume-types), e.g. Cephs, emptyDir, fibre channel, NFS, ...   By using `Persistent Volume Claims`, you can decouple the Pod from site-specific storage: You make the Pod specification more portable since you don't configure the site-specific storage but only describe what's needed from the storage: Size and permissions.  

The Persistent Volume Claim connects to a `Persistent Volume` which in turn defines access to external storage available in the cluster. A site administrator must make sure this Persistent Volume exists. So when a Persistent Volume Claim is created, it will search for an available Persistent Volume that matches the requirements of the storage request in the Persistent Volume Claim. If no match is found, there's `StorageClass` that can automatically create and allocate the storage.

This abstraction allows a developer to create and distribute generic Pod manifest files and leave the storage up to the site where it's being deployed.
We'll go over examples of this to make the concept more clear.


## Configuring Volume Storage
Pod local volumes are defined in `pod.spec.volumes`, they point to a specific volume type but for testing purposes [emptyDir](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir) and [hostPath](https://kubernetes.io/docs/concepts/storage/volumes/#hostpath) are common. This volume is mounted through `pod.spec.containers.volumeMounts`.

```
apiVersion: v1
kind: Pod
metadata: 
  name: volpod
spec:
  volumes: 
    - name: test
      emptyDir: {}
  containers:
  - name: centos1
    image: centos:7
    command:
      - sleep
      - "3600" 
    volumeMounts:
      - mountPath: /centos1
        name: test
  - name: centos2
    image: centos:7
    command:
      - sleep
      - "3600"
    volumeMounts:
      - mountPath: /centos2
        name: test
```

In the above Pod Spec, we've defined a volume named `test` with the volume type `emptyDir`. This volume is mounted in two containers on the `/centos1` and `/centos2` path inside the container. Both containers can share data via this volume:

```
student@minikube:~$ kubectl create -f volpod.yaml 
pod/volpod created
...
student@minikube:~$ kubectl exec -it volpod -c centos1 -- bash -c 'echo "Hi there!" > /centos1/hello'
student@minikube:~$ kubectl exec -it volpod -c centos2 -- cat /centos2/hello
Hi there!
```

## Persistent Volume Storage
A Persistent Volume is a resource that exists independently from any Pod, it ensures that data is kept during container or Pod restarts. We'll use a Persistent Volume Claim to connect to a Persistent Volume. The Persistent Volume Claim is what actually talks to the backend storage provider and it will use volumes available on that storage type: It will search for available volumes depending on the requested capacity and access mode. 

```
kind: PersistentVolume
apiVersion: v1
metadata:
  name: pv-volume
  labels:
      type: local
spec:
  capacity:
    storage: 2Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mydata"
```

In the above `PersistentVolume` we've created a Persistent Volume resource with the name `pv-volume`, a capacity of 2GB, an accessMode of `ReadWriteOnce` and a hostPath of `/mydata`. The hostPath is created on the worker-node where the Pod that will use this PersistentVolume is running. `ReadWriteOnce` makes sure that only one Pod can read/write data at the same time, `ReadWriteMany` or `ReadOnly` can be used as well. 

```
student@minikube:~$ kubectl create -f pv.yaml 
persistentvolume/pv-volume created

student@minikube:~$ kubectl get pv
NAME        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   REASON   AGE
pv-volume   2Gi        RWO            Retain           Available                                   70s

student@minikube:~$ kubectl describe pv pv-volume
Name:            pv-volume
Labels:          type=local
Annotations:     <none>
Finalizers:      [kubernetes.io/pv-protection]
StorageClass:    
Status:          Available
Claim:           
Reclaim Policy:  Retain
Access Modes:    RWO
VolumeMode:      Filesystem
Capacity:        2Gi
Node Affinity:   <none>
Message:         
Source:
    Type:          HostPath (bare host directory volume)
    Path:          /mydata
    HostPathType:  
Events:            <none>
```

## Configuring Persistent Volume Claims
To use a Persistent Volume, we need a Persistent Volume Claim which requests access to Persistent Volume. The Pod Volume spec uses the name of the Persistent Volume Claim and in turn the PVC accesses the Persistent Volume. After connecting to a Persistent Volume, the Persistent Volume Claim will show as bound. The bind is exclusive, the Persistent Volume cannot be used by another Persistent Volume Claim.

```
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: pv-claim
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

Notice that in the above spec, the PVC does not connect to a specific Persistent Volume. The only thing we see is that we need a volume with a capacity of 1GB and ReadWriteOnce access.

```
student@minikube:~$ kubectl create -f pvc.yaml 
persistentvolumeclaim/pv-claim created

student@minikube:~$ kubectl get pvc
NAME       STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pv-claim   Bound    pvc-d5f02edb-3d71-4a69-b977-71fd5bfa020e   1Gi        RWO            standard       22s

student@minikube:~$ kubectl get pv
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM              STORAGECLASS   REASON   AGE
pv-volume                                  2Gi        RWO            Retain           Available                                              11m
pvc-d5f02edb-3d71-4a69-b977-71fd5bfa020e   1Gi        RWO            Delete           Bound       default/pv-claim   standard                39s

```
Our `pv-volume` Persistent Volume was not used and instead a new Persistent Volume was created by StorageClass because there was no available match due to the capacity request in the PVC.

## Pod Storage with PV and PVC
The purpose of configuring a Pod with a Persistent Volume Claim is to decouple from site-specific information: When distributing a Pod spec with a PVC spec we do not need to know anything about site-specific storage.  The PVC will find the necessary Persistent Volume storage to bind to:

```
---
kind: PersistentVolumeClaim
apiVersion: v1
metadata:
  name: nginx-pvc
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 2Gi
---
kind: Pod
apiVersion: v1
metadata:
   name: nginx-pvc-pod
spec:
  volumes:
    - name: site-storage
      persistentVolumeClaim:
        claimName: nginx-pvc
  containers:
    - name: pv-container
      image: nginx
      ports:
        - containerPort: 80
          name: webserver
      volumeMounts:
        - mountPath: "/usr/share/nginx/html"
          name: site-storage
```

```
student@minikube:~$ kubectl create -f ckad/pvc-pod.yaml 
persistentvolumeclaim/nginx-pvc created
pod/nginx-pvc-pod created

student@minikube:~$ kubectl get pvc
NAME        STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
nginx-pvc   Bound    pvc-b7327501-ff4c-4f6d-9c79-d10c6ce771e8   2Gi        RWX            standard       13s

student@minikube:~$ kubectl get pv
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM               STORAGECLASS   REASON   AGE
pvc-b7327501-ff4c-4f6d-9c79-d10c6ce771e8   2Gi        RWX            Delete           Bound    default/nginx-pvc   standard                9s

student@minikube:~$ kubectl describe pv pvc-b7
Name:            pvc-b7327501-ff4c-4f6d-9c79-d10c6ce771e8
Labels:          <none>
Annotations:     hostPathProvisionerIdentity: 3d1fa9ec-a297-4851-8782-97e7eb238447
                 pv.kubernetes.io/provisioned-by: k8s.io/minikube-hostpath
Finalizers:      [kubernetes.io/pv-protection]
StorageClass:    standard
Status:          Bound
Claim:           default/nginx-pvc
Reclaim Policy:  Delete
Access Modes:    RWX
VolumeMode:      Filesystem
Capacity:        2Gi
Node Affinity:   <none>
Message:         
Source:
    Type:          HostPath (bare host directory volume)
    Path:          /tmp/hostpath-provisioner/default/nginx-pvc
    HostPathType:  
Events:            <none>

student@minikube:~$ kubectl exec -it nginx-pvc-pod -- touch /usr/share/nginx/html/testfile
student@minikube:~$ minikube ssh
docker@minikube:~$ ls /tmp/hostpath-provisioner/default/nginx-pvc/
testfile
```

## StorageClass
Kubernetes StorageClass allows for automatic provisioning of Persistent Volumes when a Persistent Volume Claim request comes in. This must be backed by a Storage Provisioner which ultimately takes care of the volume configuration.  
StorageClass can also be used a a selector label with the `storageClassName` field. Normally, PVC to PV binding is done on best match. 
```
---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: task-pv-volume
  labels:
    type: local
spec:
  storageClassName: manual
  capacity:
    storage: 2Gi
  accessModes:
    - ReadWriteMany
  hostPath:
    path: "/mnt/data"
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: task-pv-claim
spec:
  storageClassName: manual
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: task-pv-pod
spec:
  volumes:
    - name: task-pv-storage
      persistentVolumeClaim:
        claimName: pv-claim
  containers:
    - name: task-pv-container
      image: httpd
      ports:
        - containerPort: 80
          name: "httpd-server"
      volumeMounts:
        - mountPath: "/var/www/html"
          name: task-pv-storage
```
