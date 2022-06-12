---
title: "Kubernetes 101: Kubernetes Essentials"
date: 2021-10-02
url: /kubernetes-101-kubernetes-essentials
toc: false
draft: false
images:
  - /img/kubernetes.png
tags:
  - Containers
  - Docker
  - Kubernetes
---

{{<figure class="center" src="/img/kubernetes.png" alt="Kubernetes logo" width="200px">}}

# Managing Basic Pod Features

> Deployments are the standard for running applications in Kubernetes. For the sake of getting familiar with Kubernetes and understanding the essentials, we'll be creating and running native Pods.


## Understanding Pods
A Pod is an abstraction of a server which can run multiple containers within a single namespace, exposed by a single IP address.
The Pod is the smallest entity that can be created and managed by Kubernetes: Kubernetes does not manage containers, it manages Pods.

### Managing Pods with kubectl
Typically managed Pods are started through a Deployment resource.  
Naked Pods are started using the `kubectl run` option: `kubectl run mynginx --image=nginx`  
Naked Pods cannot be scaled, are not rescheduled in case of failure, cannot be replaced automatically and can't have rolling updates.

* `kubectl run -h`: Show all options for creating a Pod. 
* `kubectl run mynginx --image=nginx`: Start a Pod with the name mynginx from the nginx Dockerhub image.
* `kubectl get pods`: Show the parameters of all Pods
* `kubectl get pods mynginx`: Show the parameters of a specific Pod
* `kubectl get pods mynginx -o yaml`: Show the output in YAML format.
* `kubectl describe pods`: Show all details about all pods
* `kubectl describe pods mynginx`: Show all details about a specific Pod

## YAML
[YAML](https://yaml.org/) is a human-readable data-serialization language which uses indentation to identify relations.

### Basic YAML Manifest Ingredients
All of the YAML manifest ingredients are defined in the API. You can use `kubectl explain` to get more information about the YAML fields or properties:
```
student@minikube:~$ kubectl explain pods
KIND:     Pod
VERSION:  v1

DESCRIPTION:
     Pod is a collection of containers that can run on a host. This resource is
     created by clients and scheduled onto hosts.

FIELDS:
   apiVersion	<string>
     APIVersion defines the versioned schema of this representation of an
     object. Servers should convert recognized schemas to the latest internal
     value, and may reject unrecognized values. More info:
     https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources

   kind	<string>
     Kind is a string value representing the REST resource this object
     represents. Servers may infer this from the endpoint the client submits
     requests to. Cannot be updated. In CamelCase. More info:
     https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds

   metadata	<Object>
     Standard object's metadata. More info:
     https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata

   spec	<Object>
     Specification of the desired behavior of the pod. More info:
     https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status

   status	<Object>
     Most recently observed status of the pod. This data may not be up to date.
     Populated by the system. Read-only. More info:
     https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status

student@minikube:~$ kubectl explain pods.spec
...
student@minikube:~$ kubectl explain pods.spec.containers
...
```
The `kubectl explain pods.spec.containers` command shows us that the container spec has multiple fields of which the below are the most important ones:
```
FIELDS:

  name <string> -required-
    Name of the container specified as a DNS_LABEL.

  image <string>
    Docker image name.  

  command <[]string>
    Entrypoint array. Not executed within a shell. The docker image's
    ENTRYPOINT is used if this is not provided.

  args <[]string>
    Arguments to the entrypoint. The docker image's CMD is used if this is not
    provided

  env  <[]Object>
    List of environment variables to set in the container. Cannot be updated.
```
  

If you have a YAML file with a Pod spec you can create a Pod from it:
```
student@minikube:~$ cat busybox.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: busybox2
  namespace: default
spec:
  containers:
  - name: busy
    image: busybox
    command:
      - sleep
      - "3600" 
student@minikube:~$ kubectl create -f busybox.yaml 
pod/busybox2 created

student@minikube:~$ kubectl get pods
NAME       READY   STATUS              RESTARTS   AGE
busybox2   0/1     ContainerCreating   0          7s
```
Similarly you can delete or update (apply Spec changes) the Pod using the same YAML file:
```
student@minikube:~$ kubectl delete -f busybox.yaml 
pod "busybox2" deleted

student@minikube:~$ kubectl apply -f busybox.yaml 
pod/busybox2 created

student@minikube:~$ kubectl apply -f busybox.yaml 
pod/busybox2 unchanged
```

## Generating YAML files
By using YAML files we use Kubernetes in a declarative way where the files are typically stored in a git repository and which fits well into a DevOps strategy. The imperative way of working with Kubernetes is where you create everything from the command line. 

We can write YAML files but we should *generate* them instead and modify it to suit our specific needs:  
`kubectl run mynginx --image=nginx --dry-run=client -o yaml > mynginx.yaml`  
The `--dry-run` option prevents Kubernetes from actually running the Pod. 

## Understanding and Configuring Multi-Container Pods

The one-container Pod is the standard, they are easier to build and maintain. Typically, to create applications that consists of multiple containers, micro-services should be used. In a microservice, different independently managed Pods are connected by resources provided by Kubernetes.

There are some use cases where you might want to run multiple containers in a single Pod:
* Sidecar container: A container that enhances the primary application, for example logging.
* Ambassador container: A container that represents the primary container to the outside world, for example a proxy.
* Adapter container: Used to adopt the traffic or data pattern to match the traffic or data pattern in other applications in the cluster.

These containers are not defined by specific Pod properties, you won't find information on their specs in `kubectl explain pod.spec`.

### Sidecar Containers
A sidecar container is providing additional functionality to the main container where it makes no sense to run this functionality in a separate Pod. The essence is that the main container and sidecar container have access to shared resources in order to exchange information.  
e.g. [Istio service mesh](https://istio.io/latest/about/service-mesh/) injects sidecar containers in Pods to enable traffic management.

Here's a basic example of a multi-container Pod:
```
student@minikube:~$ cat sidecar.yaml 
kind: Pod
apiVersion: v1
metadata:
  name: sidecar-pod
spec:
  volumes:
  - name: logs
    emptyDir: {}

  containers:
  - name: main
    image: busybox
    command: ["/bin/sh"]
    args: ["-c", "while true; do date >> /var/log/date.txt; sleep
10;done"]
    volumeMounts:
    - name: logs
      mountPath: /var/log

  - name: sidecar
    image: centos/httpd
    ports:
    - containerPort: 80
    volumeMounts:
    - name: logs
      mountPath: /var/www/html
```

The shared resource in the above example is the volume with the name `logs` and the `emptyDir: {}` property.
An [emptyDir](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir) volume is initially empty and can be mounted at different paths in different containers as we can see in the above YAML by looking at the container `volumeMounts`.

The `main` container writes the current date and time to `/var/log/date.txt` every 10 seconds, while the `sidecar` container will be able to read and present the file to a user since it has the same volume mounted albeit on a different path from the container perspective.

Let's create the Pod, open a shell session in the `sidecar` container and run `cURL` to check the output created by the `main` container:
```
student@minikube:~$ kubectl create -f sidecar.yaml 
pod/sidecar-pod created

student@minikube:~$ kubectl get pods
NAME          READY   STATUS    RESTARTS   AGE
sidecar-pod   2/2     Running   0          10s

student@minikube:~$ kubectl exec -it sidecar-pod -c sidecar -- /bin/bash
[root@sidecar-pod /]# yum install curl -y
....
[root@sidecar-pod /]# curl http://localhost/date.txt
....
```

## Managing Init Containers
An [init container](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/) is an additional container in a Pod that needs to complete a task before the "regular" container is started. As long as the init container hasn't completed its job, the regular container is not started.

Have a look at this official [example YAML file](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#init-containers-in-use) fo init containers.
We'll work with a more simplified version here:
```
apiVersion: v1
kind: Pod
metadata:
  name: init-demo
spec:
  containers:
  - name: nginx
    image: nginx
  initContainers:
  - name: init-box
    image: busybox
    command:
    - sleep
    - "3600"
```
In the above example our `init-box` container will sleep for 1 hour and only once the sleep command finishes our `nginx` container will spin up.
We can see our Pod is in the Init status:
```
student@minikube:~$ kubectl create -f init-demo.yaml 
pod/init-demo created

student@minikube:~$ kubectl get pods
NAME        READY   STATUS     RESTARTS   AGE
init-demo   0/1     Init:0/1   0          4s
```

We can use the describe command to get more information about the Pod:
```
student@minikube:~$ kubectl describe pod init-demo
...
Init Containers:
  init-box:
    Container ID:  docker://c23ec32c3ba19d43417c730117b6319b0c57d6c8938c76ae641b1afad0e08c11
    Image:         busybox
    Image ID:      docker-pullable://busybox@sha256:caa382c432891547782ce7140fb3b7304613d3b0438834dce1cad68896ab110a
    Port:          <none>
    Host Port:     <none>
    Command:
      sleep
      3600
    State:          Running
...
Containers:
  nginx:
    Container ID:   
    Image:          nginx
    Image ID:       
    Port:           <none>
    Host Port:      <none>
    State:          Waiting
      Reason:       PodInitializing
...
```
The Events section in the output of the `describe` command shows us what containers have been started:
```
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  78s   default-scheduler  Successfully assigned default/init-demo to minikube
  Normal  Pulling    77s   kubelet            Pulling image "busybox"
  Normal  Pulled     65s   kubelet            Successfully pulled image "busybox" in 11.886228471s
  Normal  Created    65s   kubelet            Created container init-box
  Normal  Started    64s   kubelet            Started container init-box
```


## Using NameSpaces
Kubernetes leverages Linux kernel-level resource isolation: [NameSpaces](https://en.wikipedia.org/wiki/Linux_namespaces).  Different NameSpaces can be used to strictly separate between customer resources and to apply different security-related settings such as Role-Based Access Control and Quotas.

Let's demonstrate this the ***imparative*** way:
```
# Show all available namespaces
student@minikube:~$ kubectl get ns
NAME              STATUS   AGE
default           Active   14d
kube-node-lease   Active   14d
kube-public       Active   14d
kube-system       Active   14d

# Show all resources per namespace
student@minikube:~$ kubectl get all -A
NAMESPACE     NAME                                   READY   STATUS    RESTARTS       AGE
kube-system   pod/coredns-64897985d-sj5lw            1/1     Running   3 (108s ago)   14d
...

#  Create a new namespace
student@minikube:~$ kubectl create ns secret
namespace/secret created

# Start a new Pod in the new namespace
student@minikube:~$ kubectl run secretnginx --image=nginx -n secret
pod/secretnginx created

student@minikube:~$ kubectl get pods
No resources found in default namespace.

# List all Pods in the secret namespace
student@minikube:~$ kubectl get pods -n secret
NAME          READY   STATUS              RESTARTS   AGE
secretnginx   0/1     ContainerCreating   0          10s

```

We can do the same thing the ***declarative*** way by defining `namespace` under the Pod `metadata`:
```
apiVersion: v1
kind: Pod
metadata:
  name: busyboxPod
  namespace: secret
```

Check properties of the namespace using the `describe` command:
```
student@minikube:~$ kubectl describe ns secret
Name:         secret
Labels:       kubernetes.io/metadata.name=secret
Annotations:  <none>
Status:       Active

No resource quota.

No LimitRange resource.
```

Lastly, let's ***declaratively*** combine the creation of a namespace and a pod inside the same namespace:
```
student@minikube:~$ kubectl create ns production --dry-run=client -o yaml > nginx_prod.yml
student@minikube:~$ cat nginx_prod.yml 
apiVersion: v1
kind: Namespace
metadata:
  creationTimestamp: null
  name: production
spec: {}
status: {}
```
Notice that `kind` is `Namespace`.  
Now, we add the Pod to the same namespace inside the same Yaml file:

```
student@minikube:~$ kubectl run nginx-prod -n production --image=nginx --dry-run=client -o yaml >> nginx_prod.yml 
student@minikube:~$ cat nginx_prod.yml 
apiVersion: v1
kind: Namespace
metadata:
  creationTimestamp: null
  name: production
spec: {}
status: {}
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: nginx-prod
  name: nginx-prod
  namespace: production
spec:
  containers:
  - image: nginx
    name: nginx-prod
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}

```
We should modify the Yaml file in such a way that it's clear we're dealing with 2 Yaml list items in a single file. We'll add the `---` lines to indicate the start of a new list item:
```
student@minikube:~$ cat nginx_prod.yml 
---
apiVersion: v1
kind: Namespace
metadata:
  creationTimestamp: null
  name: production
spec: {}
status: {}
---
apiVersion: v1
kind: Pod
metadata:
  creationTimestamp: null
  labels:
    run: nginx-prod
  name: nginx-prod
  namespace: production
spec:
  containers:
  - image: nginx
    name: nginx-prod
    resources: {}
  dnsPolicy: ClusterFirst
  restartPolicy: Always
status: {}
```

... and we can now create the actual resources from the Yaml file:
```
student@minikube:~$ kubectl create -f nginx_prod.yml 
namespace/production created
pod/nginx-prod created

student@minikube:~$ kubectl get all -n production
NAME             READY   STATUS              RESTARTS   AGE
pod/nginx-prod   0/1     ContainerCreating   0          15s
student@minikube:~$
```

# Managing Advanced Pod Features

## Exploring Pod State
`kubectl describe pod podname` is a human-readable way to see all Pod parameters and settings as currently stored in the etcd database. You can use the [offical documentation](https://kubernetes.io/docs) for more information about these settings and parameters.

While we can `describe` the Pod externally, we can also connect to the Pod and run commands on the primary container in the Pod:  
* Connect using `kubectl exec -it podname -- sh`
* Disconnect by executing the `exit` command. (or CTR+P CTRL+Q if the shell is running as process ID 1)

```
student@minikube:~$ kubectl get pods
NAME      READY   STATUS    RESTARTS   AGE
mynginx   1/1     Running   0          44s

student@minikube:~$ kubectl get pods mynginx -o json | less
...
student@minikube:~$ kubectl get pods mynginx -o yaml | less
...
student@minikube:~$ kubectl describe pods mynginx
...
student@minikube:~$ kubectl exec -it mynginx -- sh
# pwd
/
# ps aux
sh: 1: ps: not found
# cd /proc
# ls
1   acpi       cmdline	 diskstats    filesystems  irq	      kmsg	   locks    mounts	  sched_debug  softirqs       sysvipc	   version
34  asound     consoles  dma	      fs	   kallsyms   kpagecgroup  mdstat   mtrr	  schedstat    stat	      thread-self  version_signature
35  buddyinfo  cpuinfo	 driver       interrupts   kcore      kpagecount   meminfo  net		  scsi	       swaps	      timer_list   vmallocinfo
53  bus        crypto	 execdomains  iomem	   key-users  kpageflags   misc     pagetypeinfo  self	       sys	      tty	   vmstat
60  cgroups    devices	 fb	      ioports	   keys       loadavg	   modules  partitions	  slabinfo     sysrq-trigger  uptime	   zoneinfo
# cat 1/cmdline
nginx: master process nginx -g daemon off;
# cat 53/cmdline
sh
# cat 35/cmdline
nginx: worker process
# exit
student@minikube:~$ 
```
Most containers run minimal images where not all commands may be available, in the above example the `ps` command is not available. In this case we can make advantage of the `proc` pseudo filesystem.


## Using Pod Logs
The Pod entrypoint application does not connect to any STDOUT, instead, application output is sent to the Kubernetes cluster. We can use `kubectl logs` to see this output and help us in troubleshooting:

```
student@minikube:~$ kubectl run mydb --image=mariadb
pod/mydb created

student@minikube:~$ kubectl get pods
NAME      READY   STATUS              RESTARTS   AGE
mydb      0/1     ContainerCreating   0          5s
...
student@minikube:~$ kubectl get pods
NAME      READY   STATUS             RESTARTS      AGE
mydb      0/1     CrashLoopBackOff   1 (15s ago)   76s

student@minikube:~$ kubectl describe pod mydb
...
    State:          Waiting
      Reason:       CrashLoopBackOff
    Last State:     Terminated
      Reason:       Error
      Exit Code:    1
...

student@minikube:~$ kubectl logs mydb
[ERROR] [Entrypoint]: Database is uninitialized and password option is not specified
	You need to specify one of MARIADB_ROOT_PASSWORD, MARIADB_ALLOW_EMPTY_ROOT_PASSWORD and MARIADB_RANDOM_ROOT_PASSWORD
```
Looking at the log output, we needed to specify one or more specific environment variables.  Let's fix this, but since we can't update a Pod (only deployments which we'll see later) we need to delete our Pod first:
```
student@minikube:~$ kubectl delete pod mydb
pod "mydb" deleted

student@minikube:~$ kubectl run mydb --image=mariadb --env="MARIADB_ROOT_PASSWORD=myrootpassword"
pod/mydb created

student@minikube:~$ kubectl get pods
NAME      READY   STATUS    RESTARTS   AGE
mydb      1/1     Running   0          40s

student@minikube:~$ kubectl logs mydb
[Note] mariadbd: ready for connections.
Version: '10.7.3-MariaDB-1:10.7.3+maria~focal'  socket: '/run/mysqld/mysqld.sock'  port: 3306  mariadb.org binary distribution
```

## Port Forwarding
A simple way of accessing a Pod is by using Port Forwarding: Expose a port on the host running the Pod that forwards to the Pod. This is useful for testing Pod accessibility on a specific cluster node but isn't used to expose the Pod to external users. Regular user access to applications in the Pod is provided via Services and Ingress.

When you run `kubectl get pods -o wide` or `kubectl describe pod podname` you'll see the Pod has an IP address. This IP address is accessible only from within the cluster, you cannot use it to address the Pod from outside the cluster.
```
student@minikube:~$ kubectl get pods mynginx -o wide
NAME      READY   STATUS    RESTARTS   AGE   IP           NODE       NOMINATED NODE   READINESS GATES
mynginx   1/1     Running   0          63m   172.17.0.3   minikube   <none>           <none>

student@minikube:~$ ping 172.17.0.3
PING 172.17.0.3 (172.17.0.3) 56(84) bytes of data.
^C
--- 172.17.0.3 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss, time 2053ms

student@minikube:~$ curl 172.17.0.3
curl: (7) Failed to connect to 172.17.0.3 port 80: No route to host
```

So if we need to test network accessibility to our Pod, we use Port Forwarding:
```
student@minikube:~$ kubectl port-forward mynginx 8080:80 &
[1] 19855
student@minikube:~$ Forwarding from 127.0.0.1:8080 -> 80
Forwarding from [::1]:8080 -> 80
student@minikube:~$

```
This command starts a port forwarding process in the foreground, so we add the `&` at the end of the command to start it in the background.

```
student@minikube:~$ curl localhost:8080
Handling connection for 8080
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
```

To stop port forwarding, we bring the process back to the foreground and stop it using CTRL+C:
```
student@minikube:~$ fg
minikube kubectl -- port-forward mynginx 8080:80
^C
student@minikube:~$
```


## Configuring securityContext
A securityContext defines privileges and access control settings ***for a Pod and/or container***, and includes:
* Discretionary Access Control
* SELinux or AppArmor
* Running as privileged or unprivileged user
* AllowPrivilegeEscalation to control if a process can gain more privileges than its parent process

`kubectl explain` can give you a complete overview.

Let's work with examples:
```
student@minikube:~$ kubectl explain pod.spec.securityContext
...
student@minikube:~$ kubectl explain pod.spec.containers.securityContext
...
student@minikube:~/ckad$ cat securitycontextdemo2.yaml 
apiVersion: v1
kind: Pod
metadata:
  name: security-context-demo
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  volumes:
  - name: sec-ctx-vol
    emptyDir: {}
  containers:
  - name: sec-ctx-demo
    image: busybox
    command: [ "sh", "-c", "sleep 1h" ]
    volumeMounts:
    - name: sec-ctx-vol
      mountPath: /data/demo
    securityContext:
      allowPrivilegeEscalation: false

student@minikube:~/ckad$ kubectl create -f securitycontextdemo2.yaml 
pod/security-context-demo created

student@minikube:~/ckad$ kubectl get pods security-context-demo -o yaml
...
spec:
  containers:
  - command:
    - sh
    - -c
    - sleep 1h
    image: busybox
    imagePullPolicy: Always
    name: sec-ctx-demo
    resources: {}
    securityContext:
      allowPrivilegeEscalation: false
...

student@minikube:~/ckad$ kubectl exec -it security-context-demo -- sh
/ $ cd data/demo
/data/demo $ echo "Hello" > test
/data/demo $ ls -l
total 4
-rw-r--r--    1 1000     2000             6 Mar 24 17:05 test
/data/demo $ id
uid=1000 gid=3000 groups=2000
```
When we create a new file in the Pods primary container, we see that the owner of the file is id `1000` (`runAsUser`) and group owner is `2000` (`fsGroup`) as specified in the Yaml securityContext. The `id` command reveals our `runAsUser` ID, our primary group id `3000` and our secondary group id `2000`.


## Managing Jobs
Pods are the essence of Kubernetes, when your Pod goes down then Kubernetes will start a new Pod. In that sense, Pods are normally created to run forever.  There can be cases where you want a Pod to execute a one-shot task, like backup jobs, a calculation or batch processing. This is were you can use Jobs: The Pod will run until it finishes its task then stops.

We can set `ttlSecondsAfterFinished` to clean up completed Jobs automatically so that we don't keep both the Job and the Pod (created by the Job) around forever.

There are 3 different Job types specified by the `completion` and `parallelism` parameters:
* Non-parallel Jobs: 1 Job - 1 Pod
  * `completions=X`
  * `paralellism=1`  
* Parallel Jobs with a fixed completion count: the Job is completed after successfully running as many times as specified by `jobs.spec.completions`. The number of parallel or concurrent Pods that are started by the Job are specified by `jobs.spec.parallelism`.
  * `completions=X` 
  * `paralellism=Y`  
* Parallel Jobs with a work queue: Multiple Jobs are started, when one completes the Job is done.
  * `completions=1`
  * `parallelism=X`

Here's an example:
```
student@minikube:~$ kubectl create job onejob --image=busybox --dry-run=client -o yaml -- date > onejob.yml
student@minikube:~$ cat onejob.yml 
apiVersion: batch/v1
kind: Job
metadata:
  creationTimestamp: null
  name: onejob
spec:
  template:
    metadata:
      creationTimestamp: null
    spec:
      containers:
      - command:
        - date
        image: busybox
        name: onejob
        resources: {}
      restartPolicy: Never
status: {}
```
Notice that `kind` is `Job` and that `restartPolicy` is set to `Never`. In this example the container just executes the `date` command and then is done.

```
student@minikube:~$ kubectl create -f onejob.yml 
job.batch/onejob created

student@minikube:~$ kubectl get jobs
NAME     COMPLETIONS   DURATION   AGE
onejob   0/1           4s         4s

student@minikube:~$ kubectl get jobs,pods
NAME               COMPLETIONS   DURATION   AGE
job.batch/onejob   0/1           7s         7s

NAME               READY   STATUS              RESTARTS   AGE
pod/onejob-zjgd9   0/1     ContainerCreating   0          7s
```

Once the Job is done, the Job `COMPLETIONS` and Pod `STATUS` is updated:
```
student@minikube:~$ kubectl get jobs,pods
NAME               COMPLETIONS   DURATION   AGE
job.batch/onejob   1/1           10s        41s

NAME               READY   STATUS      RESTARTS   AGE
pod/onejob-zjgd9   0/1     Completed   0          41s

student@minikube:~$ kubectl delete -f onejob.yml 
job.batch "onejob" deleted

```

Now let's create a parallel Job:
```
student@minikube:~$ kubectl create job paralleljob --image=busybox --dry-run=client -o yaml -- sleep 5 > paralleljob.yml

student@minikube:~$ cat paralleljob.yml 
apiVersion: batch/v1
kind: Job
metadata:
  creationTimestamp: null
  name: paralleljob
spec:
  completions: 6
  parallelism: 3
  ttlSecondsAfterFinished: 60
  template:
    metadata:
      creationTimestamp: null
    spec:
      containers:
      - command:
        - sleep
        - "5"
        image: busybox
        name: paralleljob
        resources: {}
      restartPolicy: Never
status: {}
```

After generating the YAML file we've added the `completions`, `parallelism` and `ttlSecondsAfterFinished` values.  

Until the Job has completed 6 times, the Job will make sure that 3 Pods are running the Job at all times. When one Pod finished a new Pod is started. At completion of the Job, 6 Pods will have been created by the Job.
The Job and Pods are deleted after 60 seconds.

```
student@minikube:~$ kubectl create -f paralleljob.yml 
job.batch/paralleljob created

student@minikube:~$ kubectl get jobs,pods
NAME                    COMPLETIONS   DURATION   AGE
job.batch/paralleljob   6/6           29s        29s

NAME                    READY   STATUS      RESTARTS   AGE
pod/paralleljob-6s9l4   0/1     Completed   0          11s
pod/paralleljob-7swk6   0/1     Completed   0          19s
pod/paralleljob-8pzgp   0/1     Completed   0          14s
pod/paralleljob-ldmtf   0/1     Completed   0          29s
pod/paralleljob-tsk4q   0/1     Completed   0          29s
pod/paralleljob-x6p8k   0/1     Completed   0          29s

student@minikube:~$ kubectl get jobs,pods
No resources found in default namespace.
```

## Managing Cronjobs
While Jobs are used to run a task a specific number of times, CronJobs are used for tasks that are recurrent or that need to run on a regular basis. In that sense they are very similar to Linux cronjobs.  
When running a CronJob, a Job is scheduled and in turn the Job will start a Pod.

Let's go over this in detail:
```
student@minikube:~$ kubectl create cronjob -h | less
  # Create a cron job with a command
  kubectl create cronjob my-job --image=busybox --schedule="*/1 * * * *" -- date
...
student@minikube:~$ kubectl create cronjob runme --image=busybox --schedule="*/1 * * * *" -- echo Hello there!
cronjob.batch/runme created

student@minikube:~$ kubectl get cronjobs,jobs,pods
NAME                  SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
cronjob.batch/runme   */1 * * * *   False     0        <none>          15s

student@minikube:~$ kubectl get cronjobs,jobs,pods
NAME                  SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
cronjob.batch/runme   */1 * * * *   False     1        8s              28s

NAME                       COMPLETIONS   DURATION   AGE
job.batch/runme-27480120   0/1           8s         8s

NAME                       READY   STATUS              RESTARTS   AGE
pod/runme-27480120-xv5l4   0/1     ContainerCreating   0          8s

student@minikube:~$ kubectl get cronjobs,jobs,pods
NAME                  SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
cronjob.batch/runme   */1 * * * *   False     1        2s              82s

NAME                       COMPLETIONS   DURATION   AGE
job.batch/runme-27480120   1/1           13s        62s
job.batch/runme-27480121   0/1           2s         2s

NAME                       READY   STATUS              RESTARTS   AGE
pod/runme-27480120-xv5l4   0/1     Completed           0          62s
pod/runme-27480121-nljcn   0/1     ContainerCreating   0          2s
```
As you can see above, the `cronjob.batch/runme` cronjob will create a new Job at the top of each minute and each Job will create a new Pod which will run until completion of the task.

```
student@minikube:~$ kubectl delete cronjob runme
cronjob.batch "runme" deleted
student@minikube:~$ kubectl get cronjobs,jobs,pods
No resources found in default namespace.
```

## Resource Requests and Limits
By default, a Pod will consume as much CPU and memory as necessary.  
We can however use `pod.spec.containers.resources` to limit usage of those on a *per container* basis.
CPU and memory limitations are the most common, but there are others.  
Each container can has its CPU and memory usage restricted by:
- Request: `kube-scheduler` will look for a worker-node that has this amount of resources available and schedule the Pod to run there. It's allowed for a container to use more resources than defined here. If no suitable worker-node is found, the Pod status remains in `Pending`.
- Limit: This is a hard limit. If configured, the container runtime prevents the container from using more than the configured resource limit. For the memory resource type, this could result in an out of memory error if the container attempts to consume more memory than allowed.

> a Pod resource request/limit is the sum of the resource requests/limits for each resource type and  for each container in the Pod.

CPU limits are expressed in millicore or millicpu: 1/1000 of a CPU core.  
So `500m` is 0.5 CPU and `2000m` is 2 CPU.

Example:
```
---
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  containers:
  - name: db
    image: mariadb
    env:
    - name: MYSQL_ROOT_PASSWORD
      value: "password"
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
  - name: wordpress
    image: wordpress
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```
