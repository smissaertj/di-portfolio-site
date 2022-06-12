---
title: "Kubernetes 101: Understanding Kubernetes"
date: 2021-09-08
url: /kubernetes-101-understanding-kubernetes
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


# What is Kubernetes?
[https://kubernetes.io/](https://kubernetes.io/)

Kubernetes is an open-source ecosystem for automating deployment, scaling and managing of containerized applications. It provides a core solution with many third-party add-ons focusing on different areas:
* Networking
* Ingress
* Monitoring
* Packaging
* ...

Kubernetes has its origins at Google where it was known as [Borg](https://kubernetes.io/blog/2015/04/borg-predecessor-to-kubernetes/). It's currently owned by the [Cloud Native Computing Foundation](https://www.cncf.io/), an open-source foundation within the [Linux Foundation](https://linuxfoundation.org/). 

Vanilla Kubernetes is Kubernetes directly created from the source code hosted by the CNCF. Different Kubernetes distributions exist that add specific functionality and a selection of solutions from the ecosystem:
* Google Anthos
* Red Hat OpenShift
* Suse Rancher
* Canonical Kubernetes
* ...

A new release of Kubernetes is published every 3 months. When a new release is published, new versions of the API (more on that later) may become available and old features may get deprecated. If a feature is deprecated it's important to adopt the new method: because of the 3 month [release cycle](https://kubernetes.io/releases/release/#the-release-cycle), the feature will go away within the next 2 releases. 

# Kubernetes Architecture

Kubernetes has the following main components:
* Control Plane and worker nodes
* Operators (aka "control loop", "watch-loops" or "controller")
* Services
* Pods of containers
* Namespaces and quotas
* Network and policies
* Storage.

A Kubernetes cluster is made of a Control Plane node and a set of worker nodes. The cluster is driven via API calls to operators.


{{<figure class="center" src="/img/components-of-kubernetes.svg" alt="Kubernetes Architecture" link="/img/components-of-kubernetes.svg" target="_blank">}}


## The Control Plane Node

The various components responsible for ensuring that the current state of the cluster matches the desired state are called the Control Plane.

### kube-apiserver
The kube-apiserver is central to the operation of the Kubernetes cluster and exposes the Kubernetes API. You can communicate with the API using a local client called kubectl or you can write your own client and use curl commands.All actions are accepted and validated by this component, and it is the only connection to the etcd database.

### kube-scheduler
The kube-scheduler determines which node will host a Pod of containers. The scheduler will try to view available resources and then try to deploy the Pod based on availability and success.

### etcd database
The state of the cluster, networking, and other persistent information is kept in an etcd database. [etcd](https://etcd.io/) is a strongly consistent, distributed key-value store that provides a reliable way to store data that needs to be accessed by a distributed system or cluster of machines. This database is only accessible by kube-apiserver.

### kube-controller-manager
Orchestration is managed through a series of watch-loops or control loops, also called controllers or operators. A control loop is a non-terminating loop that regulates the state of a system. Each controller interrogates the kube-apiserver for a particular object state, then modifies the object until the declared state matches the current state. These controllers are compiled into the kube-controller-manager, but others can be added using custom resource definitions.  

The kube-controller-manager is a core control loop daemon which interacts with the kube-apiserver to determine the state of the cluster. If the state does not match, the manager will contact the necessary controller to match the desired state.  

  


## Worker Nodes

A Worker Node consists of components that maintain running pods.

### kubelet
The kubelet systemd process interacts with the underlying container engine. It accepts the API calls for Pod specifications and it will configure the local node until the specification has been met by passing requests to the local container engine.

### kube-proxy
The kube-proxy creates and manages networking rules to expose the container on the network to other containers or the outside world.

### Container runtime
The container runtime or container engine is responsible for running containers.  
Each Worker Node could run a different engine if needed: [Docker](https://www.docker.com/), [containerd](https://containerd.io/), [CRI-O](https://cri-o.io/), [podman](https://podman.io/), ...


## The Most Essential API Resources

### Deployment
The default operator for containers is a Deployment. A Deployment does not directly work with pods, instead it manages ReplicaSets. The ReplicaSet is an operator which will create or terminate pods according to a podSpec. The podSpec is sent to the kubelet, which then interacts with the container engine to download and make  the required resources available, then spawn or terminate containers until the status matches the spec.

### Pod
Containers are not managed individually, instead, they are part of a larger object called a Pod. A Pod consists of one or more containers which share an IP address, access to storage and namespace. Typically, one container in a Pod runs an application, while other containers support the primary application.

### Service
The service operator requests existing IP addresses and information from the endpoint operator, and will manage the network connectivity based on labels. A service is used to communicate between pods, namespaces, and outside the cluster. 


# Creating a Lab Environment

The Kubernetes 101 series of articles that I will be publishing over time are meant to provide a basic introduction to Kubernetes. As such, we'll not be using a full blown Kubernetes cluster but we'll be relying on [Minikube](https://minikube.sigs.k8s.io/docs/) instead.

With Minikube we can quickly and easily setup a local Kubernetes cluster and focus on learning the basics. In a later series, we'll deep dive into a full blown Kubernetes cluster with multiple worker nodes.

We will be installing Minikube in an Ubuntu virtual machine with 4GiB of RAM and 2vCPUs and we'll be using Docker as the container engine, so make sure you [install Docker](https://docs.docker.com/engine/install/ubuntu/) as well. 
Once your virtual machine is ready, head over to the [Minikube installation instructions](https://minikube.sigs.k8s.io/docs/start/). 
Make sure you start a cluster, install kubectl and create an alias for it to make life easier.

## Verifying Minikube is working

The minikube command has different options, here's an overview of the commonly used ones:
* `minikube status`: Gets the status of a local Kubernetes cluster.
* `minikube start`: Starts a local Kubernetes cluster.
* `minikube stop`: Stops a running local Kubernetes cluster.
* `minikube ssh`: Log into the minikube environment (for debugging)
* `minikube dashboard`: Opens the Kubernetes dashboard in the local browser.
* `minikube delete`: Deletes a local Kubernetes cluster.
* `minikube ip`: Retrieves the IP address of the specified node.
* `minikube version`: Print the version of minikube.

You can see all available options by using the `minikube --help` command.

These will come in handy as well:
* `kubectl get all`: Display all resources.
* `docker ps`: List containers.

## Bash Completion
Bash completion for `kubectl` will come in handy.
The `kubectl completion -h` command has instructions for different shells like `zsh` and `fish`.
Below are the instructions for `bash`:
```
apt install bash-completion -y
echo "source <(kubectl completion bash)" >> ~/.bashrc
source ~/.bashrc
```


## Running an application 
Let's go over the steps of starting our cluster and launching a simple Nginx Pod:

```
# We start our Minikube cluster
student@minikube:~$ minikube start
...

# Install kubectl
student@minikube:~$ minikube kubectl -- get pods -A
...

# Verify the status
student@minikube:~$ minikube status
minikube
type: Control Plane
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured

# List all Docker containers - See how Minikube is running a Kubernetes cluster inside a single Docker container
student@minikube:~$ docker ps
...

# Have a look at the different Kubernetes components which are running in Pods inside the kube-system namespace.
student@minikube:~$ kubectl get pods -n kube-system
NAME                               READY   STATUS    RESTARTS      AGE
coredns-64897985d-sj5lw            1/1     Running   0             11m
etcd-minikube                      1/1     Running   0             11m
kube-apiserver-minikube            1/1     Running   0             11m
kube-controller-manager-minikube   1/1     Running   0             11m
kube-proxy-mgcrk                   1/1     Running   0             11m
kube-scheduler-minikube            1/1     Running   0             11m
storage-provisioner                1/1     Running   1 (10m ago)   11m

# Let's run an Nginx Pod
student@minikube:~$ kubectl run nginx --image=nginx
pod/nginx created

student@minikube:~$ kubectl get pods
NAME    READY   STATUS    RESTARTS   AGE
nginx   1/1     Running   0          24s

student@minikube:~$ kubectl get all
NAME        READY   STATUS    RESTARTS   AGE
pod/nginx   1/1     Running   0          37s

NAME                 TYPE        CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
service/kubernetes   ClusterIP   10.96.0.1    <none>        443/TCP   13m
```
  
Play around with the different minikube commands, and, once done head over to the next article.

