---
title: "Kubernetes 101: Building Scalable Applications - Networking"
date: 2021-12-06
url: /kubernetes-101-building-scalable-applications-networking
toc: false
draft: false
images:
  - /img/kubernetes.png
tags:
  - Containers
  - Docker
  - Kubernetes
  - Networking
  - Services
  - Ingress
  - Ports
  - Network Policies
---

{{<figure class="center" src="/img/kubernetes.png" alt="Kubernetes logo" width="200px">}}

The Kubernetes network model dictates that:
- Every Pod has its own IP address
- Containers within a Pod share the Pod IP address and can communicate with each other using a loopback interface (`localhost`).
- Pods can communicate with all other Pods *in the cluster* using the Pod IP addresses and **without** using NAT.
- Isolation is defined by using network policies.

Pod-to-Pod communication is the foundation of Kubernetes.
You can look at a Pod like you would look at a VM, the VM has a unique IP address. The containers within the Pods are like processes running within a  VM, they run in the same network namespace and share an IP address.

Basic network connectivity is built-in with [kubenet](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#kubenet) but can be extended by using third-party network implementations that plug into Kubernetes using the Container Network Interface API.

The Kubernetes networking model relies heavily on IP addresses. Services, Pods, containers, and nodes communicate using IP addresses and ports:
- ClusterIP: The IP address assigned to a Service. This address is stable for the lifetime of the Service.
- Pod IP: The IP address assigned to a given Pod. This is ephemeral.
- Node IP: The IP address assigned to a given node.


# Services
A [Service](https://kubernetes.io/docs/concepts/services-networking/service/) is an API resource that is used to expose a logical set of Pods, determined by a selector (label), to an external network by applying round-robin load balancing that forwards the traffic. `kube-controller-manager` will continuously scan for Pods that match a selector and include those in the Service. Adding or removing Pods immediately impacts the Service.

Services exist independently from the applications or Pods they provide access to, e.g. removing a Deployment will not remove a Service.  This means that one Service can provide access to Pods in multiple Deployments, Kubernetes will automatically load balance between these Pods.  

`kube-proxy` on the nodes watches the Kubernetes API for new Services and endpoints (connected Pods). It opens random ports and listens for traffic to the Service port on the Cluster IP address, then redirects traffic to a Pod that is specified as an endpoint. It typically doesn't require any configuration.

There are different Service Types:
- `ClusterIP`: The default type which exposes the Service on an internal cluster IP address.
- `NodePort`: Opens a specific port on the node that forwards to the Service cluster IP address.
- `LoadBalancer`: Used on public cloud, it will provision a load balancer in the cloud for the Service.
- `ExternalName`: Works with DNS names.

We will focus on `ClusterIP` and `NodePort`.  

## Creating Services
`kubectl expose` can be used to create Services, providing access to Deployments, ReplicaSets, Pods or other. In most cases it exposes a Deployment which in turn allocates its Pods as the Service Endpoint. If you inspect the Service, you'll see it doesn't actually connect to the Deployment but to the Pods in the Deployment by using the Selector label. The `--port` argument is required to specify the port that the Service should use. 

There are different types of ports in Services:  
- `port`: The port on which the Service is accessible.
- `targetport`: The port on the application that the Service addresses. The same value for `port` will be used if `targetport` is not specified. 
- `nodeport`: The port that is exposed externally while using the nodePort Service type. Required when using the nodePort Service Type but is set automatically.

`kubectl create service` can be used as an alternative solution to create Services. When creating a NodePort Service type, the `port` and `targetport` are specified as a key:value pair in the `--tcp` argument:
```
kubectl create service nodeport my-node-port-service --tcp=80:80
```
Here we are not targeting a Deployment, but because I'm naming the NodePort Service `my-node-port-service` the service will look for all Pods that have the label selector `app=my-node-port-service`. 



Let's expose a simple Nginx application.

```
student@minikube:~$ kubectl create deploy nginx-app --image=nginx:latest --replicas=3
deployment.apps/nginx-app created

student@minikube:~$ kubectl expose deploy nginx-app --port=80
service/nginx-app exposed

student@minikube:~$ kubectl get service nginx-app
NAME        TYPE        CLUSTER-IP    EXTERNAL-IP   PORT(S)   AGE
nginx-app   ClusterIP   10.97.84.163   <none>        80/TCP    8s
```
We've created a service of the type `ClusterIP` which is available on the *internal* IP address `10.97.84.163`. The IP address is internal from the point of view of the Kubernetes cluster. Remember, we're not working inside the cluster:
```
student@minikube:~$ docker ps
CONTAINER ID   IMAGE                                 COMMAND                  CREATED       STATUS       PORTS                                                                                                                                  NAMES
4680f20c93ff   gcr.io/k8s-minikube/kicbase:v0.0.30   "/usr/local/bin/entr…"   2 hours ago   Up 2 hours   127.0.0.1:49157->22/tcp, 127.0.0.1:49156->2376/tcp, 127.0.0.1:49155->5000/tcp, 127.0.0.1:49154->8443/tcp, 127.0.0.1:49153->32443/tcp   minikube
```
On our `minikube` machine, we have a `minikube` Docker container running which runs the Kubernetes cluster and node inside.
This means that we cannot reach the ClusterIP address from outside of Docker.
In order to achieve that, we need to open a port on our Kubernetes Node using the `NodePort` service type. Edit the service, change the `type` and add the `nodePort` value:
```
student@minikube:~$ kubectl edit service nginx-app

# Please edit the object below. Lines beginning with a '#' will be ignored,
# and an empty file will abort the edit. If an error occurs while saving this file will be
# reopened with the relevant failures.
#
apiVersion: v1
kind: Service
metadata:
  creationTimestamp: null
  labels:
    app: nginx-app
  name: nginx-app
  namespace: default
  resourceVersion: "6160"
  uid: 8d2e2744-328d-4e1f-b8f8-96404515faae
spec:
  clusterIP: 10.97.84.163
  clusterIPs:
  - 10.97.84.163
  externalTrafficPolicy: Cluster
  internalTrafficPolicy: Cluster
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack
  ports:
  - nodePort: 32000
    port: 80
    protocol: TCP
    targetPort: 80
  selector:
    app: nginx-app
  sessionAffinity: None
  type: NodePort
status:
  loadBalancer: {}
```
Save your changes.  

```
student@minikube:~$ kubectl get service nginx-app
NAME        TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
nginx-app   NodePort   10.97.84.163   <none>        80:32000/TCP   4m8s
```
We see that our Service Type has changed and the Service is running on port 80 accessible trough NodePort 32000:
```
student@minikube:~$ curl http://$(minikube ip):32000
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
```
The `minikube ip` command shows what IP address your Kubernetes node is using, in the above example I applied [command substitution](https://joerismissaert.dev/introduction-to-bash-shell-scripting/).


`kubectl create service` can be used as an alternative solution to create Services. When creating a NodePort Service type, the `port` and `targetport` are specified as a key:value pair in the `--tcp` argument:
```
kubectl create service nodeport nginx-app --tcp=80:80
```
As opposed to the `kubectl expose deployment`, here we are not targeting a Deployment, but because I'm naming the NodePort Service `nginx-app` the service will look for all Pods that have the label selector `app=nginx-app` which would be all the Pods in our `nginx-app` Deployment. 

```
student@minikube:~$ kubectl create service nodeport nginx-app --tcp=80:80
service/nginx-app created

student@minikube:~$ kubectl describe service nginx-app
Name:                     nginx-app
Namespace:                default
Labels:                   app=nginx-app
Annotations:              <none>
Selector:                 app=nginx-app
```


## Using Service Resources in Microservices
In a microservices architecture, different frontend and backend Pods are used to provide the application:
- Frontend Pods (e.g. webservers) can be exposed for external access using the NodePort Service type.
- Backend Pods (e.g. databases) can be exposed internally only using the clusterIP Service type.

An example would be a frontend Deployment with WordPress and a backend Deployment with MariaDB. You don't want to expose MariaDB to external traffic, only the frontend Pods should be able to communicate with the database. They can do so using the Cluster IP address, or even without IP address by using a headless ClusterIP Service type. We'll cover that later on.  

## Services and DNS
Exposed Services automatically register with the Kubernetes internal DNS. The internal DNS consists of the `kube-dns` Service and the `coreDNS` Pod.  
This allows all Pods to address Services using the Service name:

```
student@minikube:~$ kubectl get service,pods -n kube-system
NAME               TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)                  AGE
service/kube-dns   ClusterIP   10.96.0.10   <none>        53/UDP,53/TCP,9153/TCP   3h39m

NAME                                   READY   STATUS    RESTARTS        AGE
pod/coredns-64897985d-2fwlb            1/1     Running   0               3h39m
```

Notice the Cluster IP address of the `kube-dns` service above.
Now, let's run a Pod and have a look at its DNS settings:

```
student@minikube:~$ kubectl run testpod --image=busybox -- sleep 3600
pod/testpod created

student@minikube:~$ kubectl exec -it testpod -- cat /etc/resolv.conf 
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```
The `nameserver` is set to the Cluster IP address of the `kube-dns` service.
Lookups are also done in the `default.svc.cluster.local` domain, where `default` is the name of the Name Space:

```
student@minikube:~$ kubectl exec -it testpod -- nslookup nginx-app
Server:		10.96.0.10
Address:	10.96.0.10:53

Name:	nginx-app.default.svc.cluster.local
Address: 10.96.165.179

student@minikube:~$ kubectl get service nginx-app
NAME        TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
nginx-app   NodePort   10.96.165.179   <none>        80:32000/TCP   8m35s
```

# Ingress
[Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/) is a Kubernetes API resource used to provide external access using DNS to internal Kubernetes cluster Services by means of an externally Ingress managed load balancer, also known as an [Ingress Controller](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/). Creating an Ingress resource without Ingress Controller has no effect, you need both. The Ingress Controller can be anything you're already familiar with: HAProxy, Nginx, Apache, traefik, kong, ...

{{<figure class="center" src="/img/Ingress.png" alt="Ingress" link="/img/Ingress.svg" target="_blank">}}



To  summarize, Ingress exposes HTTP and HTTPS routes from outside the cluster to services within the cluster. Traffic routing is controlled by rules defined on the Ingress resource. Ingress can be configured to do the following:
- Give Services externally-reachable URLs
- Terminate SSL/TLS
- Load balance traffic
- Offer name based virtual hosting


## Configuring the Minikube Ingress Controller
Minikube provides an easy Ingress integration using a Minikube addon:
```
student@minikube:~$ minikube addons list
|-----------------------------|----------|--------------|--------------------------------|
|         ADDON NAME          | PROFILE  |    STATUS    |           MAINTAINER           |
|-----------------------------|----------|--------------|--------------------------------|
| ambassador                  | minikube | disabled     | third-party (ambassador)       |
| auto-pause                  | minikube | disabled     | google                         |
| csi-hostpath-driver         | minikube | disabled     | kubernetes                     |
| dashboard                   | minikube | disabled     | kubernetes                     |
| default-storageclass        | minikube | enabled ✅   | kubernetes                     |
| efk                         | minikube | disabled     | third-party (elastic)          |
| freshpod                    | minikube | disabled     | google                         |
| gcp-auth                    | minikube | disabled     | google                         |
| gvisor                      | minikube | disabled     | google                         |
| helm-tiller                 | minikube | disabled     | third-party (helm)             |
| ingress                     | minikube | disabled     | unknown (third-party)          |
| ingress-dns                 | minikube | disabled     | google                         |
| istio                       | minikube | disabled     | third-party (istio)            |
| istio-provisioner           | minikube | disabled     | third-party (istio)            |
| kong                        | minikube | disabled     | third-party (Kong HQ)          |
| kubevirt                    | minikube | disabled     | third-party (kubevirt)         |
| logviewer                   | minikube | disabled     | unknown (third-party)          |
| metallb                     | minikube | disabled     | third-party (metallb)          |
| metrics-server              | minikube | disabled     | kubernetes                     |
| nvidia-driver-installer     | minikube | disabled     | google                         |
| nvidia-gpu-device-plugin    | minikube | disabled     | third-party (nvidia)           |
| olm                         | minikube | disabled     | third-party (operator          |
|                             |          |              | framework)                     |
| pod-security-policy         | minikube | disabled     | unknown (third-party)          |
| portainer                   | minikube | disabled     | portainer.io                   |
| registry                    | minikube | disabled     | google                         |
| registry-aliases            | minikube | disabled     | unknown (third-party)          |
| registry-creds              | minikube | disabled     | third-party (upmc enterprises) |
| storage-provisioner         | minikube | enabled ✅   | google                         |
| storage-provisioner-gluster | minikube | disabled     | unknown (third-party)          |
| volumesnapshots             | minikube | disabled     | kubernetes                     |
|-----------------------------|----------|--------------|--------------------------------|

student@minikube:~$ minikube addons enable ingress
🌟  The 'ingress' addon is enabled

student@minikube:~$ kubectl get ns
NAME              STATUS   AGE
default           Active   73m
ingress-nginx     Active   88s
kube-node-lease   Active   73m
kube-public       Active   73m
kube-system       Active   73m

student@minikube:~$ kubectl get all -n ingress-nginx
NAME                                           READY   STATUS      RESTARTS   AGE
pod/ingress-nginx-admission-create-qz4sr       0/1     Completed   0          115s
pod/ingress-nginx-admission-patch-tbzsw        0/1     Completed   1          115s
pod/ingress-nginx-controller-cc8496874-nrsq6   1/1     Running     0          115s

NAME                                         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                      AGE
service/ingress-nginx-controller             NodePort    10.101.67.244   <none>        80:30708/TCP,443:31969/TCP   116s
service/ingress-nginx-controller-admission   ClusterIP   10.106.3.163    <none>        443/TCP                      116s

NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/ingress-nginx-controller   1/1     1            1           116s

NAME                                                 DESIRED   CURRENT   READY   AGE
replicaset.apps/ingress-nginx-controller-cc8496874   1         1         1       116s

NAME                                       COMPLETIONS   DURATION   AGE
job.batch/ingress-nginx-admission-create   1/1           12s        116s
job.batch/ingress-nginx-admission-patch    1/1           13s        116s
```

## Using Ingress
The below example continues to build on the `nginx-app` Deployment and Service.

```
student@minikube:~$ kubectl create ingress nginx-app-ingress --rule="/=nginx-app:80" --rule="/hello=newdeploy:8080"
ingress.networking.k8s.io/nginx-app-ingress created
```
We create a new Ingress resource with the name `nginx-app-ingress`:
- The first rule routes traffic from the root `/` to our `nginx-app` Service on port 80.
- The second rule routes traffic from the URI `/hello` to a non existing `newdeploy` Service on port 8080.

```
student@minikube:~$ kubectl describe ingress nginx-app-ingress
Name:             nginx-app-ingress
Labels:           <none>
Namespace:        default
Address:          192.168.49.2
Default backend:  default-http-backend:80 (<error: endpoints "default-http-backend" not found>)
Rules:
  Host        Path  Backends
  ----        ----  --------
  *           
              /        nginx-app:80 (172.17.0.4:80,172.17.0.5:80,172.17.0.6:80 + 2 more...)
              /hello   newdeploy:8080 (<error: endpoints "newdeploy" not found>)
Annotations:  <none>
Events:
  Type    Reason  Age                    From                      Message
  ----    ------  ----                   ----                      -------
  Normal  Sync    3m10s (x2 over 3m11s)  nginx-ingress-controller  Scheduled for sync
```
Notice that the backends or Pods for `newdeploy` are not found.

Before proceeding, update the `/etc/hosts` file to associate a domain with the IP address of our minikube container (which is running our K8s cluster). You can find the IP by running the `minikube ip` command.
e.g. `192.168.42.2    nginx-app.demo`

Next, let's test our Ingress resource:
```
student@minikube:~$ kubectl get ingress
NAME                CLASS   HOSTS   ADDRESS        PORTS   AGE
nginx-app-ingress   nginx   *       192.168.49.2   80      12m

student@minikube:~$ curl nginx-app.demo
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>

student@minikube:~$ curl nginx-app.demo/hello
<html>
<head><title>503 Service Temporarily Unavailable</title></head>
```

We should fix the `/hello` URI by creating the `newdeploy` Deployment and Service:
```
student@minikube:~$ kubectl create deployment newdeploy --image=gcr.io/google-samples/hello-app:2.0
deployment.apps/newdeploy created

student@minikube:~$ kubectl expose deployment newdeploy --port=8080
service/newdeploy exposed

student@minikube:~$ curl nginx-app.demo/hello
Hello, world!
Version: 2.0.0
Hostname: newdeploy-698574c958-kvnbc
```


## Configuring Ingress Rules
In the previous example, we've configured the `nginx-app-ingress` Ingress resource with the rules `--rule="/=nginx-app:80" --rule="/hello=newdeploy:8080`.
Each Ingress Rules contains the following:
- An optional host. If no host is specified, the rule applies to all inbound HTTP traffic.
- A list of paths, each path has its own backend. Paths can be exposed as regular expressions.
- The backend, which consists of either a service or a resource. You can configure a default backend for incoming traffic that doesn't match any of the defined backends. The service backed relates to a Service while a resource backend refers to Cloud based object storage. We'll focus on service backends.

The Ingress `pathType` specifies how to deal with path requests:
- The `Exact` pathType indicates that an exact match should occur: If the path is set to `/foo` and the request is `/foo/`, there is no match.
- The `Prefix` pathType indicates that the requested path should start with:
  - If the path is set to `/`, any requested path will match.
  - If the path is set to `/foo`, then `/foo` as well as `/foo/` and `/foo/bar` will match.


There are different Ingress Types:
- Single Service: `kubectl create ingress ingress-name --rule="/hello=hello-service:80"`
- Simple fanout: `kubectl create ingress ingress-name --rule="/hello=hello-service:80" --rule="/goodbye=goodbye-service:80"`
- Name-based Virtual Hosting: `kubectl create ingress ingress-name --rule="my.example.com/hello*=hello-service:80" --rule="my.example.org/goodbye*=goodbye-service:80"`


Let's cover this in an example:
```
student@minikube:~$ kubectl create deploy foo --image=nginx
deployment.apps/foo created

student@minikube:~$ kubectl create deploy bar --image=httpd
deployment.apps/bar created

student@minikube:~$ kubectl expose deploy foo --port=80
service/foo exposed

student@minikube:~$ kubectl expose deploy bar --port=80
service/bar exposed

student@minikube:~$ kubectl create ingress multihost --rule="foo.example.com/=foo:80" --rule="bar.example.com/=bar:80"
ingress.networking.k8s.io/multihost created
```
Create the necessary `/etc/hosts` entries for `foo.example.com` and `bar.example.com`.
Edit the `multihost` Ingress resource and set the `pathType` to `Prefix` for both backends
```
student@minikube:~$ kubectl edit ingress multihost
ingress.networking.k8s.io/multihost edited

student@minikube:~$ kubectl get ingress multihost
NAME        CLASS   HOSTS                             ADDRESS        PORTS   AGE
multihost   nginx   foo.example.com,bar.example.com   192.168.49.2   80      75s

student@minikube:~$ curl foo.example.com
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>

student@minikube:~$ curl foo.example.com/lololol
<html>
<head><title>404 Not Found</title></head>

student@minikube:~$ curl bar.example.com
<html><body><h1>It works!</h1></body></html>
student@minikube:~$ curl bar.example.com/lololol
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>404 Not Found</title>
```

## Network Policies
By default there are no restrictions to network traffic in Kubernetes: Pods can always communicate, even if they're in other Name Spaces.
We can limit this by using Network Policies, however, this needs to be supported by the network plugin. Remember that by default Kubernetes only offers basic network connectivity and this can be expanded with third party plugins.  

If you don't use a Network Policy, all traffic is allowed. If using a Network Policy and there's *no* match, traffic is denied.
Minikube doesn't automatically start with a network plugin, so let's restart minikube and configure it to use the [Calico](https://www.tigera.io/blog/calico-networking-for-kubernetes/) network plugin:
```
student@minikube:~$ minikube stop
✋  Stopping node "minikube"  ...
🛑  Powering off "minikube" via SSH ...
🛑  1 node stopped.

student@minikube:~$ minikube delete
🔥  Deleting "minikube" in docker ...
🔥  Deleting container "minikube" ...
🔥  Removing /home/student/.minikube/machines/minikube ...
💀  Removed all traces of the "minikube" cluster.

student@minikube:~$ minikube start --cni=calico
😄  minikube v1.25.2 on Ubuntu 18.04 (amd64)
✨  Automatically selected the docker driver. Other choices: ssh, none
👍  Starting control plane node minikube in cluster minikube
🚜  Pulling base image ...
🔥  Creating docker container (CPUs=2, Memory=2200MB) ...
🐳  Preparing Kubernetes v1.23.3 on Docker 20.10.12 ...
    ▪ kubelet.housekeeping-interval=5m
    ▪ Generating certificates and keys ...
    ▪ Booting up control plane ...
    ▪ Configuring RBAC rules ...
🔗  Configuring Calico (Container Networking Interface) ...
🔎  Verifying Kubernetes components...
    ▪ Using image gcr.io/k8s-minikube/storage-provisioner:v5
🌟  Enabled addons: storage-provisioner, default-storageclass
💡  kubectl not found. If you need it, try: 'minikube kubectl -- get pods -A'
🏄  Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default

student@minikube:~$ kubectl get pods -n kube-system
NAME                                       READY   STATUS    RESTARTS      AGE
calico-kube-controllers-8594699699-r4rwl   1/1     Running   0             2m7s
calico-node-8qzhj                          1/1     Running   0             2m7s
```

As with other Kubernetes resources, when defining a Pod- or NameSpace-based NetworkPolicy, a selector label is used to specify what traffic is allowed to and from the Pods that match the selector.

Three different NetworkPolicy Identifiers can be used to match network traffic:
- `podSelector`: Allows access to a Pod with the corresponding selector label.
- `namespaceSelector`: Allows incoming traffic from namespaces with the matching selector label.
- `ipBlock`: Do not confuse with the verb *to block* - Specify a range of IP addresses that should get access.

Here's an example NetworkPolicy:
```
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: access-nginx
spec:
  podSelector:
    matchLabels:
      app: nginx
  ingress:
  - from:
    - podSelector:
        matchLabels:
          access: "true"
...

---
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels: 
    app: nginx
spec:
  containers:
  - name: nwp-nginx
    image: nginx:1.17
...

---
apiVersion: v1
kind: Pod
metadata:
  name: busybox
  labels:
    app: sleepy
spec:
  containers:
  - name: nwp-busybox
    image: busybox
    command:
    - sleep
    - "3600"
```
The above NetworkPolicy can be understood as follows:
- Apply the Network Policy to Pods that have the label `app: nginx`
- Allow incoming traffic from Pods that have the label `access: "true"`

In other words, our `nginx` Pod will only accept traffic from Pods that have the `access: "true"` label set:

```
student@minikube:~$ kubectl create -f ckad/nwpolicy-complete-example.yaml 
networkpolicy.networking.k8s.io/access-nginx created
pod/nginx created
pod/busybox created

student@minikube:~$ kubectl get networkpolicy
NAME           POD-SELECTOR   AGE
access-nginx   app=nginx      2m59s

student@minikube:~$ kubectl describe networkpolicy
Name:         access-nginx
Namespace:    default
Created on:   2021-12-01 18:12:12 +0000 UTC
Labels:       <none>
Annotations:  <none>
Spec:
  PodSelector:     app=nginx
  Allowing ingress traffic:
    To Port: <any> (traffic allowed to all ports)
    From:
      PodSelector: access=true
  Not affecting egress traffic
  Policy Types: Ingress

student@minikube:~$ kubectl expose pod nginx --port=80
service/nginx exposed

student@minikube:~$ kubectl exec -it busybox -- wget --spider --timeout=1 nginx
Connecting to nginx (10.108.90.255:80)
wget: download timed out
command terminated with exit code 1

student@minikube:~$ kubectl label pod busybox access=true
pod/busybox labeled

student@minikube:~$ kubectl exec -it busybox -- wget --spider --timeout=1 nginx
Connecting to nginx (10.108.90.255:80)
remote file exists
student@minikube:~$

```