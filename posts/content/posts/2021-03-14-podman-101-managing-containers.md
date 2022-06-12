---
title: "Podman 101: Managing and Running Containers"
date: 2021-03-14
url: /podman-101-managing-and-running-containers
toc: false
draft: false
images:
tags:
  - RHEL
  - Containers
  - Podman
  - Buildah
  - Skopeo
  - OCI
  - Systemd
  - Docker
---

{{< figure class="center" src="/img/redhat-8-logo.png" alt="Red Hat logo">}}
{{< figure class="center" src="/img/podman.png" alt="Podman logo">}}



# Understanding Containers

For a data center to operate efficiently, its machines and running components on those machines must become as generic and as much automated as possible. We can partly achieve this by seperating the applications from the operating system. This means not just packaging applications into things we install (like RPM or Deb packages), but also putting together sets of software into packages that themselves can run in ways that keep them independent and seperate from the operating system. Virtual Machines and Containers are two ways of packaging sets of software and their dependencies in a way which is separated from the host operating system they are running on.

A virtual machine is a complete operating system that runs on another operating sytem, you can have many virtual machines on one physical computer. Everything an application or service needs to run can be stored inside that virtual machine or in attached storage. A virtual machine has its own kernel, file system, process table, network interfaces and other operating system features separate from the host, while sharing CPU and RAM with the host system. A VM sees an emulation of the computer hardware and not the host hardware directly, hence the term *virtual* machine.

A Container is similar to a virtual machine, except that it doesn't have its own kernel. It remains separate from the host system by using its own set of *namespaces*. Just like a VM, you can move it from one host to another to run it wherever it is convenient. Typically you would build your own container images by getting a secure base image and then adding your own layers of software on top of that image to create a new image. To share your image, you *push* them to shared container registries from where others are allowed to *pull* them. 

Containers run on top of a container engine, like Docker, CRI-O (which is the default on RHEL 8), Moby or rkt, and typically a container runs a single application or service (which can be connected in microservices using OpenShift or Kubernetes for example), although there are systemd images from which you can build multiservice containers. 

Podman is a daemonless container engine that is compatible with Docker, for developing, managing, and running Open Container Initiative (OCI) containers and container images on Linux.

## Namespaces
Linux support for namespaces is what allows containers to be contained. With namespaces, the Linux kernel can associate one or more processes with a set of resources. Normal processes, not run in a container, use the same host namespaces. By default, processes in a container can only see the container's namespaces and not those of the host. 

* **Process table** - A container has its own set of process IDs and, by default, can only see processes running inside the container. While `PID 1` on the host is the `init` (systemd) process, in a container `PID 1` is the first process run inside the container.   

* **Network interfaces** - By default, a container has a single network interface and is assigned an IP address when the container runs. A service run inside a container is not exposed outside of the host system, by default. You can have hundreds of webservers running on the same host without conflict, but you need to manage how those ports are exposed outside of the host.  

* **Mount table** - By default, a container can't see the host's root file system or any other mounted file system listed in the host's mount table. Files or directories needed from the host can be selectively *bind-mounted* inside the container.  

* **User IDs** - Containerized processes run as some UID within the host's namespace, and, with another set of UIDs nested within the container. This can, for example, let a process run as root within the container but not have any special privileges to the host system.  

* **UTS** - The UNIX Time Sharing namespace allows a containerized process to have a different host and domain name from the host. 

* **Control Group** - A containerized process runs within a selected `cgroup` and cannot see the other cgroups available on the host system. Similarly, it cannot see the identify of its own cgroup. Control Groups are used for resource management.

* **Interprocess Communications** - A containerized process cannot see the IPC namespace of the host.

> Although **access to any host namespace is restricted by default**, privileges to host namespaces can be opened selectively. In that way, you can do things like mount configuration files or data inside the container and map container ports to host ports to expose services outside of the host.


## Container Registries
Permanent storage for containers is done in what is referred to as a *container registry*. When you create a container image that you want to share, you can *push* that image to a public or private (which you maintain yourself) container registry. Someone who wants to use your container image will then *pull* it from the registry. 

Large public container image registries are, for example, [Docker hub](https://hub.docker.com/) and [Quay Registry](https://quay.io). 

## Base Images and Layers

Although you can create containers from scratch, most often a container is built by starting with a well-known base image and adding software to it. Linux distributions offer base images in different forms, like standard and minimal versions. But there are also base images you can build on that offer runtimes for PHP, Java and other development environments.

Red Hat offers freely available Universal Base Images (UBIs) for standard, minimal and a variety of runtime containers. You can find those by searching the [Red Hat Container Catalog](https://catalog.redhat.com/software/containers/explore).

You can add software to a base image by defining the build using `yum` commands to install software from software repositories into the new container. When you add software to an image, it creates a new layer that becomes part of the new image. You can reuse the same base image for all container you build, only one copy of the base image is needed on the host. If you're running 10 different containers based on the same base image, you only need to pull and store the base image once. For each new image you build, you only add the data that differs from the base image.


# Running and Managing Containers with Podman

## Pulling and Running Containers
In order to start using containers with podman, we need to install the `container-tools` module:
```
[root@server1 student]# yum module install container-tools
...
```

Let's choose a reliable image to try out, one that comes from an official project, is up to date and has been scanned for vulnerabilities:
```
[student@server1 ~]$ podman pull registry.access.redhat.com/ubi8/ubi
Trying to pull registry.access.redhat.com/ubi8/ubi...
Getting image source signatures
Copying blob 64607cc74f9c done  
Copying blob 13897c84ca57 done  
Copying config 9992f11c61 done  
Writing manifest to image destination
Storing signatures
9992f11c61c5fa38a691f80c7e13b75960b536aade4cce8543433b24623bce68
[student@server1 ~]$
```

We can verify that the image is on our system using the **podman images** command:
```
[student@server1 ~]$ podman images
REPOSITORY                               TAG     IMAGE ID      CREATED       SIZE
registry.access.redhat.com/ubi8/ubi      latest  9992f11c61c5  11 days ago   213 MB
```

Next, let's start an interactive shell from this base image. We use the **podman run** command, specify the `-i` (interactive) and `-t` (terminal) options, followed by the name of the image (ubi) and the command we wish to start once the container is up and running (bash):
```
[student@server1 ~]$ podman run -it ubi bash
[root@888b3cbea5cc /]#
```

We are in an interactive session within the container from the bash shell. Notice the container is using the host kernel:
```
[root@888b3cbea5cc /]# ls
bin  boot  dev  etc  home  lib  lib64  lost+found  media  mnt  opt  proc  root  run  sbin  srv  sys  tmp  usr  var

[root@888b3cbea5cc /]# cat /etc/os-release  | grep -i ^NAME
NAME="Red Hat Enterprise Linux"

[root@888b3cbea5cc /]# uname -r
4.18.0-240.el8.x86_64
```

We can add software to the container:
```
[root@888b3cbea5cc /]# yum install procps -y
...

[root@888b3cbea5cc /]# ps -ef
UID          PID    PPID  C STIME TTY          TIME CMD
root           1       0  0 13:13 pts/0    00:00:00 bash
root          39       1  0 13:20 pts/0    00:00:00 ps -ef
```
Notice that form within the container, we only see two running processes: the shell and the `ps` command. PID 1 is the bash shell.

We can exit the container by using the **exit** command. The container is now no longer running, but it's still available on the host in a stopped state. The **podman ps --all** command shows all available containers:
```
[student@server1 ~]$ podman ps -a
CONTAINER ID  IMAGE                                       COMMAND               CREATED         STATUS                    PORTS                                                                  NAMES                                                    bold_aryabhata
888b3cbea5cc  registry.access.redhat.com/ubi8/ubi:latest  bash                  9 minutes ago   Exited (0) 3 seconds ago                                                                                    musing_almeida
```

## Managing Container State
Unless you specifically set a container to be removed when it's stopped (`--rm` option), paused or fails, the container is still on your system. You can see the status of all containers on the system, running or stopped, using the `podman ps` command:

```
[student@server1 ~]$ podman run -d nginx
e968c7e569cbe60d909b2108ba5a2067bb3e771327f4729b85566280efe944a6

[student@server1 ~]$ podman ps
CONTAINER ID  IMAGE                           COMMAND               CREATED        STATUS            PORTS   NAMES
e968c7e569cb  docker.io/library/nginx:latest  nginx -g daemon o...  4 seconds ago  Up 3 seconds ago          loving_swartz

[student@server1 ~]$ podman stop e968
e968c7e569cbe60d909b2108ba5a2067bb3e771327f4729b85566280efe944a6

[student@server1 ~]$ podman ps
CONTAINER ID  IMAGE   COMMAND  CREATED  STATUS  PORTS   NAMES

[student@server1 ~]$ podman ps -a
CONTAINER ID  IMAGE                                       COMMAND               CREATED         STATUS                    PORTS   NAMES
e968c7e569cb  docker.io/library/nginx:latest              nginx -g daemon o...  27 seconds ago  Exited (0) 5 seconds ago          loving_swartz
```

The `podman stop` command sends a SIGTERM signal and if the container doesn't stop after 10 seconds it will send a SIGKILL signal. 
You can also send the SIGKILL signal immediately using the `podman kill` command.
Just like the `podman stop` command stops a container, you can start a container using `podman start` or simply restart a container using `podman restart`.

Lastly, we can delete the container permanently by using the `podman rm` command:
```
[student@server1 ~]$ podman rm e968
e968c7e569cbe60d909b2108ba5a2067bb3e771327f4729b85566280efe944a6

[student@server1 ~]$ podman ps -a
CONTAINER ID  IMAGE                                       COMMAND  CREATED        STATUS                    PORTS   NAMES
[student@server1 ~]$
```
Note that the `podman rm` command only deletes the container and not the image.


## Running commands in a container
When we are detached from a container we can still execute commands inside the container using `podman exec`:
```
[student@server1 ~]$ podman exec cd87 cat /etc/os-release | grep ^NAME
NAME="Debian GNU/Linux"
```

Or, we can attach to the container:
```
[student@server1 ~]$ podman exec -it cd87 /bin/bash
root@cd87164b978f:/#
```
...and detach using the `CTRL-P+Q` sequence.

## Managing Container Ports
We can map a host port to the container application port to make the application in the container reachable from the host machine:
```
[student@server1 ~]$ podman run -d -p 8000:80 nginx
965fe32d0b4b96d469ddb5638edaa5ac18fe41fc083082844bc8ddae0f6a9a33

[student@server1 ~]$ podman ps
CONTAINER ID  IMAGE                           COMMAND               CREATED        STATUS            PORTS                 NAMES
965fe32d0b4b  docker.io/library/nginx:latest  nginx -g daemon o...  3 seconds ago  Up 2 seconds ago  0.0.0.0:8000->80/tcp  musing_mclaren

[student@server1 ~]$ podman port -a
965fe32d0b4b  80/tcp -> 0.0.0.0:8000

[student@server1 ~]$ podman port 965
80/tcp -> 0.0.0.0:8000
```
In the example above, we mapped the host port 8000 to port 80 of the container.
Note that you can only map container ports to non privileged (>1024) ports on the host when running rootless containers.

With the above done, we can `curl` the host port and see Nginx serving its default content:
```
[student@server1 ~]$ curl localhost:8000
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
    body {
        width: 35em;
        margin: 0 auto;
        font-family: Tahoma, Verdana, Arial, sans-serif;
    }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>

```

Now, if we would want access from outside of the host machine, we should not forget to configure the host machine's firewall:
```
[student@server1 ~]$ su - root
Password: 
[root@server1 ~]# firewall-cmd --add-port=8000/tcp --permanent && firewall-cmd --reload
success
success
[root@server1 ~]# exit
logout
[student@server1 ~]$
```

>By default podman runs rootless containers.
Rootless containers cannot bind to a privileged port and do NOT have an IP address, you would need port forwarding instead. If you need a container with an IP address, you need a root container: `sudo podman run -d nginx`


## Attaching Storage to Containers
Storage in containers is ephemeral: modifications are written to the container writeable layer and stay around for the container lifetime.
For persistent storage needs, we use bind mounts to connect a directory inside the container to a directory on the host machine.

We start preparing on the hostmachine, creating directories, setting basic permissions and changing the SELinux file context type to `container_file_t`. 
SELinux is very important when using root containers, as without, the root container will have access to the entire host file system.

I'll run through an example where we set the document root of the `nginx` image to the `/home/student/html` directory on the host machine. Inside that directory we'll create a basic html file that the nginx container is going to serve.

### Preparing Host Storage
```
[root@server1 student]# pwd
/home/student

[student@server1 ~]$ ls -l
total 0
drwxrwxr-x. 2 student student 6 Apr 12 21:29 html

[root@server1 student]# semanage fcontext -a -t container_file_t "/home/student/html(/.*)?"
[root@server1 student]# restorecon -Rv /home/student/html
Relabeled /home/student/html from unconfined_u:object_r:user_home_t:s0 to unconfined_u:object_r:container_file_t:s0
```

### Mounting Storage Inside the Container.
At this point we can delete the container from the previous example, start a new container and bind mount the host directory `/home/student/html` to the default document root of Nginx in the container: `/usr/share/nginx/html`


If the container user is owner of the host directory, the `:Z` (SELinux) option can be used:
`podman run -d --name web1 -p 8000:80 -v /home/student/html:/usr/share/nginx/html:Z nginx`

* `--d` we run the container in detached mode.
* `--name` we set a name for our new container.
* `-p` we map the host port to the container port.
* `-v` we bind a host directory to a directory inside the container.
* `nginx` the name of the image we use to start our container from. 

```
[student@server1 ~]$ podman run -d --name web1 -p 8000:80 -v /home/student/html:/usr/share/nginx/html:Z nginx
1988217288c55050a2820881ccf75e4436097d8128f9d2dec8a08af6674c6f88

[student@server1 ~]$ podman ps
CONTAINER ID  IMAGE                           COMMAND               CREATED        STATUS            PORTS                 NAMES
1988217288c5  docker.io/library/nginx:latest  nginx -g daemon o...  4 seconds ago  Up 4 seconds ago  0.0.0.0:8000->80/tcp  web1

[student@server1 ~]$ curl localhost:8000
<html>
<head><title>403 Forbidden</title></head>
<body>
<center><h1>403 Forbidden</h1></center>
<hr><center>nginx/1.19.9</center>
</body>
</html>
```
After starting the container, you'll see that the `curl` test now returns a `403 Forbidden` status.
This is because the Nginx document root is bound to an empty directory on our host machine. Let's create an html file for Nginx to serve:
```
[student@server1 ~]$ echo "<h1>TEST NGINX</h1>" > html/index.html
[student@server1 ~]$ curl localhost:8000
<h1>TEST NGINX</h1>
[student@server1 ~]$ 
```

At this point we can manage the content that Nginx is serving directly from the host machine.


### Environment Variables
Podman allows us to set arbitrary environment variables that will become available to processes running in the container:  
```
podman run -d --name mydb -e MYSQL_ROOT_PASSWORD=password -e MYSQL_USER=student -e MYSQL_PASSWORD=password -e MYSQL_DATABASE=studentdb -p 3306:3306 mariadb
```
Using the `-e` option, in the above example, we set the MySQL root password, user, password and database name. If we don't specify a value for a variable, then podman will look for the value in the host environment and only set it if that variable has a value.

Similarly, instead of passing the environment variables one by one, we can define them in a file and then pass the filename to podman using the `--env-file` option:
`podman run -d --name mydb --env-file=variables.txt -p 9999:3306 mariadb`

```
[student@server1 ~]$ cat variables.txt 
MYSQL_ROOT_PASSWORD=password
MYSQL_USER=student
MYSQL_PASSWORD=password
MYSQL_DATABASE=studentdb
```
We can now connect from the host machine to the MariaDB instance in the container:
```
[student@server1 ~]$ podman run -d --name mydb --env-file=variables.txt -p 3306:3306 mariadb
bd08dcbd3eef3907423ee2e55164e1e222a511f58a96d2c4e474f4ea8d56235b

[student@server1 ~]$ mysql -u student -h 127.0.0.1 -p
Enter password: 

Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 3
Server version: 5.5.5-10.5.9-MariaDB-1:10.5.9+maria~focal mariadb.org binary distribution

Copyright (c) 2000, 2020, Oracle and/or its affiliates. All rights reserved.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| studentdb          |
+--------------------+
2 rows in set (0.00 sec)
```

>Some containers **require** environment variables to run them. If a container fails because of this requirement, use `podman logs container_name` to see the application log.
Alternatively, use `podman inspect | grep -i usage`.



## Managing Containers as Services
Now that we have a running container, we can auto start it in a stand-alone situation. The container would start running even though the user that is running the container is not logged in.
For this we can create systemd *user* unit files (for rootless containers), and manage them with **systemctl**.

Systemd user services start when a user session is opened, and close when the user session is stopped.
We need to use the `loginctl enable-linger` command to start systemd user services at boot without requiring the user to login:
```
[root@server1 ~]# loginctl enable-linger student
[root@server1 ~]# loginctl show-user student | grep -i ^linger
Linger=yes
[root@server1 ~]# 
```

Next, we use `podman generate systemd` to generate a user systemd unit file. This will create the file in the working directory.
We need to create the `~/.config/systemd/user` directory (for a root container what would be in `/etc/systemd/system`), and move the user unit file into this directory.
```
[student@server1 ~]$ mkdir -p ~/.config/systemd/user
[student@server1 ~]$ podman generate systemd --name mydb --files
/home/student/container-mydb.service

[student@server1 ~]$ mv container-mydb.service ~/.config/systemd/user/
[student@server1 ~]$ systemctl --user daemon-reload 
[student@server1 ~]$ systemctl --user enable container-mydb.service 
Created symlink /home/student/.config/systemd/user/multi-user.target.wants/container-mydb.service → /home/student/.config/systemd/user/container-mydb.service.
Created symlink /home/student/.config/systemd/user/default.target.wants/container-mydb.service → /home/student/.config/systemd/user/container-mydb.service.
[student@server1 ~]$
```
When we reboot our host machine, the `mydb` container will automatically start even though the `student` user is not logged in.

To have systemd create the container when the service starts, and delete the container when the service stops, add the `--new` option. Keep in mind you'll lose all changes if you didn't configure persistent storage for the container:  
```
[student@server1 ~]$ podman generate systemd --name mydb --files --new
```

## Working with Images
An image is a read-only but runnable instance of a container that can be used to build new images.
They are obtained from registries which are configured in `/etc/containers/registries.conf`:
```
[student@server1 ~]$ grep -ia1 ^registries /etc/containers/registries.conf 
[registries.search]
registries = ['registry.access.redhat.com', 'registry.redhat.io', 'docker.io']

--
[registries.insecure]
registries = []

--
[registries.block]
registries = []
```

Under the `[registries.search]` value we find an array of registries that will be searched for a specific image in the order they appear in. 
For example, if you do `podman pull nginx`, podman will look for the `nginx` image on `registry.access.redhat.com`, `registry.redhat.io`, `docker.io` subsequently until it finds the image.

Registries that do not use TLS when using images, or which are using self-signed certificates need to be placed under `[registries.insecure]`.

You can block specific registries under `[registries.block]`, or, if you specify a wildcard (`"*"`) then all registries are blocked except those that were specified under `[registries.search]`.

You can also verify what regestries are in used by issueing the `podman info` command.

### Searching for images
We use the `podman search` command to search for images on either all configured registries or only on specific registries. The search results can be filtered using different options as well. 
A few examples below:
```
[student@server1 ~]$ podman search docker.io/nginx --limit 1
INDEX       NAME                      DESCRIPTION                STARS   OFFICIAL   AUTOMATED
docker.io   docker.io/library/nginx   Official build of Nginx.   14707   [OK] 

[student@server1 ~]$ podman search registry.redhat.io/nginx --limit 1
INDEX       NAME                                 DESCRIPTION                                       STARS   OFFICIAL   AUTOMATED
redhat.io   registry.redhat.io/rhel8/nginx-116   Platform for running nginx 1.16 or building ...   0 

[student@server1 ~]$ podman search docker.io/mariadb --filter is-official=true
INDEX       NAME                        DESCRIPTION                                       STARS   OFFICIAL   AUTOMATED
docker.io   docker.io/library/mariadb   MariaDB Server is a high performing open sou...   4043    [OK]       
```


### Inspecting Images
Now that we have an idea of what nginx images are available to us, we can inspect them remotely (without pulling them) using `skopeo`:
```
[student@server1 ~]$ skopeo inspect docker://docker.io/nginx
{
    "Name": "docker.io/library/nginx",
    "Digest": "sha256:6b5f5eec0ac03442f3b186d552ce895dce2a54be6cb834358040404a242fd476",
    "RepoTags": [
        "1-alpine-perl",
        "1-alpine",
...
```
Note that the `skopeo inspect` command always takes the `docker://` prefix regardless of what registry the image you're inspecting is located on:
```
[student@server1 ~]$ skopeo inspect docker://registry.redhat.io/rhel8/mariadb-103
{
    "Name": "registry.redhat.io/rhel8/mariadb-103",
    "Digest": "sha256:c6f117263e36880af79bba1de2018462126d226439d28d074f30bcfaf57dabe1",
    "RepoTags": [
        "1-116",
        "1-116-source",
...
```


If we have a *local* image we wish to inspect, we can use `podman inspect` instead:
```
[student@server1 ~]$ podman images
REPOSITORY                           TAG     IMAGE ID      CREATED      SIZE
docker.io/library/nginx              latest  519e12e2a84a  3 days ago   137 MB
docker.io/library/mariadb            latest  e76a4b2ed1b4  10 days ago  407 MB
registry.access.redhat.com/ubi8/ubi  latest  9992f11c61c5  13 days ago  213 MB
[student@server1 ~]$ podman inspect registry.access.redhat.com/ubi8/ubi
[
    {
        "Id": "9992f11c61c5fa38a691f80c7e13b75960b536aade4cce8543433b24623bce68",
        "Digest": "sha256:17ff29c0747eade777e8b9868f97ba37e6b8b43f5ed2dbf504ff9277e1c1d1ca",
        "RepoTags": [
            "registry.access.redhat.com/ubi8/ubi:latest"
...
```
 
### Removing Images
When new images become available, the old version of the image is kept on your system.
We can remove images using the `podman rmi` command:
```
[student@server1 ~]$ podman images
REPOSITORY                           TAG     IMAGE ID      CREATED      SIZE
docker.io/library/nginx              latest  519e12e2a84a  3 days ago   137 MB
docker.io/library/mariadb            latest  e76a4b2ed1b4  10 days ago  407 MB
registry.access.redhat.com/ubi8/ubi  latest  9992f11c61c5  13 days ago  213 MB

[student@server1 ~]$ podman rmi ubi
Untagged: registry.access.redhat.com/ubi8/ubi:latest
Deleted: 9992f11c61c5fa38a691f80c7e13b75960b536aade4cce8543433b24623bce68

[student@server1 ~]$ podman images
REPOSITORY                 TAG     IMAGE ID      CREATED      SIZE
docker.io/library/nginx    latest  519e12e2a84a  3 days ago   137 MB
docker.io/library/mariadb  latest  e76a4b2ed1b4  10 days ago  407 MB
```

### Creating Images from a Dockerfile
We can use `podman` and `buildah` to create new images from a Dockerfile. The resulting images are OCI compliant, so they will work on any runtime that meets the OCI Runtime Specification (such as Docker and CRI-O).

In the below example we prepare a Dockerfile to install the Apache webserver onto a Fedora image and later use `podman build` to create a new image from this Dockerfile.

```
[student@server1 ~]$ cat Dockerfile 
# Base on the Fedora image
FROM fedora:latest
MAINTAINER Joeri Smissaert

# Update image and install Nginx
RUN dnf -y update; dnf -y clean all
RUN dnf -y install httpd

# Expose the default port 80
EXPOSE 80

# Run Nginx
CMD ["/usr/sbin/httpd","-DFOREGROUND"]

[student@server1 ~]$ podman build -t fedora-apache .
...

[student@server1 ~]$ podman images
REPOSITORY                           TAG     IMAGE ID      CREATED         SIZE
localhost/fedora-apache              latest  cb083eb46577  15 minutes ago  483 MB

[student@server1 ~]$ podman run -d --name myweb1 -p 8080:80 fedora-apache
2f8f1ef6c484f2825f7a11f30c8601799b0736145917f6428b395b4c599cbd6e

[student@server1 ~]$ podman ps
CONTAINER ID  IMAGE                             COMMAND               CREATED        STATUS            PORTS                   NAMES
2f8f1ef6c484  localhost/fedora-apache:latest    /usr/sbin/httpd -...  3 seconds ago  Up 2 seconds ago  0.0.0.0:8080->80/tcp    myweb1
```

### Tagging and Pushing an Image to a Registry
In this example, I'll tag and push the `fedora-apache` image to [Quay.io](https://quay.io).
```
[student@server1 ~]$ podman login quay.io
Username: ********
Password: 
Login Succeeded!

[student@server1 ~]$ podman tag fedora-apache quay.io/smissaertj/fedora-apache:v1.0
[student@server1 ~]$ podman push quay.io/smissaertj/fedora-apache:v1.0
Getting image source signatures
Copying blob 7ddfcddbaf0e done  
Copying blob dcbc36c2ed7d done  
Copying blob 6d668c00f3f1 done  
Copying config cb083eb465 done  
Writing manifest to image destination
Copying config cb083eb465 [--------------------------------------] 0.0b / 1.9KiB
Writing manifest to image destination
Storing signatures
[student@server1 ~]$
```

You can find the image here:
https://quay.io/smissaertj/fedora-apache