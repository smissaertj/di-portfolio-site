---
title: "Kubernetes 101: Building Scalable Applications - Deployments"
date: 2021-11-03
url: /kubernetes-101-building-scalable-applications-deployments
toc: false
draft: false
images:
  - /img/kubernetes.png
tags:
  - Containers
  - Docker
  - Kubernetes
  - Deployments
  - Labels
  - Selectors
  - UpdateStrategy
---

{{<figure class="center" src="/img/kubernetes.png" alt="Kubernetes logo" width="200px">}}

# Deployments

[Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) are the standard for running applications in Kubernetes, it protects Pods and will automatically restart them if anything goes wrong. Additionally, it offer features that add to the scalability and reliability of the application:
* Scalability: Scaling the number of application instances to meet the demand.
* Updates and Update Strategy: Zero-downtime application updates

We use the `kubectl create deploy` command to create a Deployment:
```
student@minikube:~$ kubectl create deployment myweb --image=nginx --replicas=3
deployment.apps/myweb created

student@minikube:~$ kubectl describe deploy myweb
Name:                   myweb
Namespace:              default
CreationTimestamp:      Mon, 01 Nov 2021 09:08:57 +0000
Labels:                 app=myweb
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=myweb
Replicas:               3 desired | 3 updated | 3 total | 3 available | 0 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=myweb
  Containers:
   nginx:
    Image:        nginx
    Port:         <none>
    Host Port:    <none>
    Environment:  <none>
    Mounts:       <none>
  Volumes:        <none>
Conditions:
  Type           Status  Reason
  ----           ------  ------
  Available      True    MinimumReplicasAvailable
  Progressing    True    NewReplicaSetAvailable
OldReplicaSets:  <none>
NewReplicaSet:   myweb-8764bf4c8 (3/3 replicas created)
Events:
  Type    Reason             Age    From                   Message
  ----    ------             ----   ----                   -------
  Normal  ScalingReplicaSet  2m29s  deployment-controller  Scaled up replica set myweb-8764bf4c8 to 3


student@minikube:~$ kubectl get all
NAME                        READY   STATUS    RESTARTS   AGE
pod/myweb-8764bf4c8-6gxv8   1/1     Running   0          4m23s
pod/myweb-8764bf4c8-6mvn8   1/1     Running   0          4m23s
pod/myweb-8764bf4c8-q72nq   1/1     Running   0          4m23s

NAME                 TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
service/kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   36m

NAME                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/myweb   3/3     3            3           4m23s

NAME                              DESIRED   CURRENT   READY   AGE
replicaset.apps/myweb-8764bf4c8   3         3         3       4m23s

```

We created the `myweb` deployment based on the `nginx` image with 3 replicas or desired Pods. Notice the `Labels` and `Selector` fields.  
The Deployment created the [ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) to ensure that a specified number of Pods are always running at any given time, and it created the Pods. Both the ReplicaSet and the Pods are managed by the Deployment.  

You cannot manage Pods independently when they are part of a Deployment.
When trying to delete a Pod, the Deployment kicks in and uses the ReplicaSet to make sure we have 3 running Pods:
```
student@minikube:~$ kubectl delete pod myweb-8764bf4c8-6gxv8
kpod "myweb-8764bf4c8-6gxv8" deleted

student@minikube:~$ kubectl get pods
NAME                    READY   STATUS              RESTARTS   AGE
myweb-8764bf4c8-6mvn8   1/1     Running             0          14m
myweb-8764bf4c8-q72nq   1/1     Running             0          14m
myweb-8764bf4c8-qf2vc   0/1     ContainerCreating   0          5s
```
  
### Deployment Scalability
Before `Deployments` existed, `ReplicaSets` were used to manage scalability. In the previous section we saw that our deployment created the necessary `ReplicaSet`: Manage ReplicaSets only through Deployments. We do not care about managing `ReplicaSets` individually.

We can use the `kubectl scale deployment` command to manually scale an existing deployment:  
`kubectl scale deployment my-deployment --replicas=5`

```
student@minikube:~$ kubectl scale deployment myweb --replicas=5
deployment.apps/myweb scaled

student@minikube:~$ kubectl describe deploy myweb | grep -i replicas
Replicas:               5 desired | 5 updated | 5 total | 5 available | 0 unavailable

student@minikube:~$ kubectl get pods
NAME                    READY   STATUS              RESTARTS   AGE
myweb-8764bf4c8-44zxq   0/1     ContainerCreating   0          3s
myweb-8764bf4c8-6mvn8   1/1     Running             0          36m
myweb-8764bf4c8-7dpnx   0/1     ContainerCreating   0          3s
myweb-8764bf4c8-q72nq   1/1     Running             0          36m
myweb-8764bf4c8-qf2vc   1/1     Running             0          22m
```

Additionally, there's the `kubectl edit deployment` command which opens a text-editor for you, similar to `systemctl edit` for editing Systemd Unit files. This command, however, does not allow you to modify every single setting of a deployment.  
In the below example I changed the deployment namespace and replicas:
```
student@minikube:~$ kubectl edit deploy myweb
A copy of your changes has been stored to "/tmp/kubectl-edit-3283969971.yaml"
error: the namespace from the provided object "secret" does not match the namespace "default". You must pass '--namespace=secret' to perform this operation.
```
As you can see, Kubernetes isn't happy about changing the namespace.


### Deployment Updates
Deployments allow for zero-downtime application updates.  
When an update is applied, a new ReplicaSet is created with the new properties: Pods with the new properties are started in the new ReplicaSet. After updating, the old ReplicaSet is no longer used and may be deleted. Or, you can keep it around for rolling-back. The `deployment.spec.revisionHistoryLimit` is set to keep the last 10 ReplicaSets.

The `deployment.spec.strategy.type` property defines how to handle updates:
- `RollingUpdate`: The default value. Replaces old Pods with new Pods in such a way to ensure the application remains available to users.
- `Recreate`: Kill all existing Pods before creating new ones. The application will be down. 
More on the this later...


Let's perform a rolling update of Nginx using the `kubectl set` command. The command only accepts a limited amount of arguments.
```

student@minikube:~$ kubectl create deploy mynginx --image=nginx:1.14
deployment.apps/mynginx created

student@minikube:~$ kubectl describe deploy mynginx
Name:                   mynginx
Namespace:              default
CreationTimestamp:      Sat, 02 Apr 2022 10:29:52 +0000
Labels:                 app=mynginx
Annotations:            deployment.kubernetes.io/revision: 1
Selector:               app=mynginx
Replicas:               1 desired | 1 updated | 1 total | 0 available | 1 unavailable
StrategyType:           RollingUpdate
MinReadySeconds:        0
RollingUpdateStrategy:  25% max unavailable, 25% max surge
Pod Template:
  Labels:  app=mynginx
  Containers:
   nginx:
    Image:        nginx:1.14

student@minikube:~$ kubectl get all --selector app=mynginx
NAME                           READY   STATUS    RESTARTS   AGE
pod/mynginx-6b9d85f696-w4wpt   1/1     Running   0          64s

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/mynginx   1/1     1            1           64s

NAME                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/mynginx-6b9d85f696   1         1         1       64s
```
Notice the `Image` field in the output of the `kubectl describe` command, the default `StrategyType`,  as well as how the middle part of the Pod name matches the suffix of the `ReplicaSet` name: `pod/mynginx-6b9d85f696-w4wpt ` => `replicaset.apps/mynginx-6b9d85f6960`. We can conclude that this Pod belongs to that ReplicaSet.

Now, update the image version to `1.17`.
The `kubectl set` command only accepts a limited amount of arguments.
```
student@minikube:~$ kubectl set 
env             image           resources       selector        serviceaccount  subject 

student@minikube:~$ kubectl set image deploy mynginx nginx=nginx:1.17
deployment.apps/mynginx image updated

student@minikube:~$ kubectl get all --selector app=mynginx
NAME                           READY   STATUS              RESTARTS   AGE
pod/mynginx-6b9d85f696-w4wpt   1/1     Running             0          7m4s
pod/mynginx-6d9cd8f877-g4dkv   0/1     ContainerCreating   0          8s

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/mynginx   1/1     1            1           7m4s

NAME                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/mynginx-6b9d85f696   1         1         1       7m4s
replicaset.apps/mynginx-6d9cd8f877   1         1         0       9s
```
We see that our old ReplicaSet and Pod are still there, our application is still available, while a new Pod with the new Nginx image is being created.
Once the new Pod is running, the old Pod will be deleted but the old (empty) ReplicaSet will still be there:
```
student@minikube:~$ kubectl get all --selector app=mynginx
NAME                           READY   STATUS    RESTARTS   AGE
pod/mynginx-6d9cd8f877-g4dkv   1/1     Running   0          2m4s

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/mynginx   1/1     1            1           9m

NAME                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/mynginx-6b9d85f696   0         0         0       9m
replicaset.apps/mynginx-6d9cd8f877   1         1         1       2m5s
```

The rolling update is complete and the old ReplicaSet is still available in case  we need to roll back (covered later on in this article).

### Labels, Selectors, and Annotations
[Labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/) are key:value pairs that are defined in resources like Pods, Deployments and Services. They are either set automatically or can be set manually by an administrator. Each label key that is attached to a single object resource must be unique, though different objects can have the same label key:value pairs. This allows us to group objects, or map a specific structure onto objects, and query only the objects with a specific label.  

If we look back at our previous deployment, we can see that each object in the deployment has the `app=mynginx` label set:
```
student@minikube:~$ kubectl describe pod mynginx-6d9cd8f877-g4dkv | grep Labels:
Labels:       app=mynginx

student@minikube:~$ kubectl describe rs mynginx | grep Labels:
Labels:         app=mynginx

student@minikube:~$ kubectl describe deploy mynginx | grep Labels:
Labels:                 app=mynginx
```
So using a *label selector*, we can target the related objects of a specific application.  
e.g.:
```
student@minikube:~$ kubectl get all --selector app=mynginx
NAME                           READY   STATUS    RESTARTS   AGE
pod/mynginx-6d9cd8f877-g4dkv   1/1     Running   0          29m

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/mynginx   1/1     1            1           36m

NAME                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/mynginx-6b9d85f696   0         0         0       36m
replicaset.apps/mynginx-6d9cd8f877   1         1         1       29m
```
Our `kubectl create deployment` command automatically set the `app=appname` label, where `appname` is the name of the deployment.


Example:
```
student@minikube:~$ kubectl create deploy mylabel --image=nginx
deployment.apps/mylabel created

student@minikube:~$ kubectl label deploy mylabel state=demo
deployment.apps/mylabel labeled

student@minikube:~$ kubectl get deploy --show-labels
NAME      READY   UP-TO-DATE   AVAILABLE   AGE   LABELS
mylabel   1/1     1            1           45s   app=mylabel,state=demo

student@minikube:~$ kubectl get deploy --selector state=demo
NAME      READY   UP-TO-DATE   AVAILABLE   AGE
mylabel   1/1     1            1           70s
```

Notice that while we've given the deployment `mylabel` a new label, this new label is **not** inherited by the resources or objects created by the deployment:
```
student@minikube:~$ kubectl get all --show-labels
NAME                           READY   STATUS    RESTARTS   AGE     LABELS
pod/mylabel-566dc5f574-ctkqg   1/1     Running   0          7m28s   app=mylabel,pod-template-hash=566dc5f574

NAME                 TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE    LABELS
service/kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   168m   component=apiserver,provider=kubernetes

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE     LABELS
deployment.apps/mylabel   1/1     1            1           7m28s   app=mylabel,state=demo

NAME                                 DESIRED   CURRENT   READY   AGE     LABELS
replicaset.apps/mylabel-566dc5f574   1         1         1       7m28s   app=mylabel,pod-template-hash=566dc5f574

student@minikube:~$ kubectl get all --selector state=demo
NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/mylabel   1/1     1            1           8m58s
```

We can also remove a label. Let's remove the label with the key `app` from the Pod `mylabel-566dc5f574-ctkqg`:
```
student@minikube:~$ kubectl label pod mylabel-566dc5f574-ctkqg app-
pod/mylabel-566dc5f574-ctkqg unlabeled

student@minikube:~$ kubectl get all
NAME                           READY   STATUS              RESTARTS   AGE
pod/mylabel-566dc5f574-ctkqg   1/1     Running             0          12m
pod/mylabel-566dc5f574-pxkdz   0/1     ContainerCreating   0          5s

NAME                 TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
service/kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   174m

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/mylabel   0/1     1            0           12m

NAME                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/mylabel-566dc5f574   1         1         0       12m

student@minikube:~$ kubectl get all --selector app=mylabel
NAME                           READY   STATUS    RESTARTS   AGE
pod/mylabel-566dc5f574-pxkdz   1/1     Running   0          3m

NAME                      READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/mylabel   1/1     1            1           15m

NAME                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/mylabel-566dc5f574   1         1         1       15m
```
Our deployment could no longer find the Pod which is supposed to have the `app=mylabel` label, so it created a new Pod: `mylabel-566dc5f574-pxkdz`.  
Since the Pod with the removed label is no longer managed by our deployment, we can delete it without our deployment (or rather ReplicaSet) recreating it.



[Annotations](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/) can't be used in queries, but are useful to provide detailed non-identifying metadata in an object: maintainer, author, license, ...


### Update Strategy
When a Deployment changes, the Pods are immediately updated according to the [Update Strategy](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy):
* `RollingUpdate`: Updates Pods one at a time to guarantee availability of the application. 
* `Recreate`:  All Pods are killed and new Pods are created. This leads to temporary unavailability of the application which can be useful when different versions of an application cannot run simultaneously (e.g. a database). 

The task of the Deployment is to ensure that enough Pods are running at all times. When a change is made, the changed version is deployed in a new ReplicaSet. The old ReplicaSet is scaled to 0 (deactivated) once the update was confirmed as successful. We can use `kubectl rollout history` to get details about recent transactions, and `kubectl rollout undo` to undo a previous change.

The `RollingUpdate` options guarantee a certain minimal and maximum number of Pods to be always available:
* `maxUnavailable`: Determines the maximum number of Pods that are upgraded at the same time.
* `maxSurge`: The number of Pods that can run beyond the desired number of Pods specified in the ReplicaSet to guarantee minimal availability.

```
student@minikube:~$ kubectl get deploy mylabel -o yaml
...
spec:
  progressDeadlineSeconds: 600
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: mylabel
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
...
```

### Deployment History
At this point we know that Deployment updates create a new ReplicaSet with new properties, the old ReplicaSet is kept but is scaled down to 0 Pods. Since the old ReplicaSet is kept around, we can easily undo a change. We can use `kubectl rollout history` to get details about recent roll outs, and `kubectl rollout undo` to undo a previous change.

Let's start by updating our `mylabel` deployment. We'll give all the Pods a new environment variable: `foo=bar`:

```
kubectl set env deploy mylabel foo=bar
deployment.apps/mylabel env updated

student@minikube:~$ kubectl rollout history deploy mylabel
deployment.apps/mylabel 
REVISION  CHANGE-CAUSE
1         <none>
2         <none>

student@minikube:~$ kubectl rollout history deploy mylabel --revision=1
deployment.apps/mylabel with revision #1
Pod Template:
  Labels:	app=mylabel
	pod-template-hash=566dc5f574
  Containers:
   nginx:
    Image:	nginx
    Port:	<none>
    Host Port:	<none>
    Environment:	<none>
    Mounts:	<none>
  Volumes:	<none>


student@minikube:~$ kubectl rollout history deploy mylabel --revision=2
deployment.apps/mylabel with revision #2
Pod Template:
  Labels:	app=mylabel
	pod-template-hash=57f55bcb47
  Containers:
   nginx:
    Image:	nginx
    Port:	<none>
    Host Port:	<none>
    Environment:
      foo:	bar
    Mounts:	<none>
  Volumes:	<none>

```

We can see that we added the environment variable in revision 2.
So let's roll back revision 1:

```
student@minikube:~$ kubectl rollout undo deploy mylabel --to-revision=1
deployment.apps/mylabel rolled back
```

### Deployment Alternatives
There are two additional Deployments alternatives:
- `StatefulSets`: the workload API object used to manage stateful applications. We'll cover these once we know more about Networking and Storage.
- `DaemonSet`: ensures that all (or some) Nodes run a copy of a Pod (1 Pod, no replicas). As nodes are added to the cluster, Pods are added to them. As nodes are removed from the cluster, those Pods are garbage collected. Deleting a DaemonSet will clean up the Pods it created.

A simple use case for a [DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) is for example the need to run some sort of Agent on every worker-node.

The YAML code for DaemonSets needs to be created from scratch, you can't use `kubectl create` to generate the YAML :(
Example YAML code:
```
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nginxdaemon
  namespace: default
  labels:
    k8s-app: nginxdaemon
spec:
  selector:
    matchLabels:
      name: nginxdaemon
  template:
    metadata:
      labels:
        name: nginxdaemon
    spec:
      containers:
      - name: nginx
        image: nginx
```

```
student@minikube:~$ kubectl create -f daemon.yaml 
daemonset.apps/nginxdaemon created

student@minikube:~$ kubectl get ds,pods
NAME                         DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.apps/nginxdaemon   1         1         1       1            1           <none>          13s

NAME                    READY   STATUS    RESTARTS   AGE
pod/nginxdaemon-5nn27   1/1     Running   0          13s
```
