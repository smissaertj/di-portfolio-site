---
title: "Podman 102: Building a WordPress multi-service container with Nginx, PHP-FPM and MariaDB"
date: 2021-04-13
url: /podman-102-wordpress-multi-service-container
toc: false
draft: false
images:
  - /img/podman.png
tags:
  - RHEL
  - Containers
  - Podman
  - Systemd
  - WordPress
  - PHP-FPM
  - MariaDB
  - Nginx
  - LXD
---

{{< figure class="center" src="/img/redhat-8-logo.png" alt="Red Hat logo">}}
{{< figure class="center" src="/img/podman.png" alt="Podman logo">}}


Typically an application container runs a single service, but instead of breaking apart existing multi-serivce applications into microservices (and connecting them with e.g. Kubernetes or OpenShift), we can use Podman (in contrast to Docker) to run multi-service containers using Systemd. Basically we would achieve something similar to LXD system containers but with Podman.

Podman understands what Systemd needs to do to run in a container. When Podman starts a container that is running init or systemd as its initial command, Podman automatically sets up the tmpfs and cgroups so that Systemd can start succesfully.

>Systemd attempts to write to the cgroup file system. By default, containers cannot write to the cgroup file system when SELinux is enabled. The `container_manage_cgroup` boolean must be enabled for this to be allowed on a SELinux enforced system: `setsebool -P container_manage_cgroup true`

In this post I'll create a rather basic multi-service container based on the Fedora container image which will be running Nginx, MariaDB and PHP-FPM to serve up a WordPress site with persistent storage both for the document root and the database.

I've pushed the final version of the image I've build below to [my Quay.io repository](https://quay.io/repository/smissaertj/fedora_wordpress?tab=info).

## Step 1 - Test Nginx

```
[student@server1 ~]$ cat Dockerfile
FROM fedora
MAINTAINER Joeri Smissaert

RUN dnf -y upgrade; dnf -y install nginx; dnf clean all; systemctl enable nginx
RUN mkdir -p /var/www/worpdress.server1.local/public
RUN mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
ADD https://gist.githubusercontent.com/smissaertj/9d02fd974b64fd1a30fd905bc730a098/raw/dee50eb0bea7b93acb6ad0ddb6894cefb74c9d45/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["/sbin/init"]
```

Let's build the image:
```
podman build -t fedora_wordpress .
```

...start the container:
```
[student@server1 ~]$ podman run -d --name test -p 8080:80 -v /home/student/html:/var/www/wordpress.server1.local/public:Z fedora_wordpress
...
```

...create a test file in the bind mounted document root and test using cURL:
```
[student@server1 ~]$ mkdir html
[student@server1 ~]$ echo "JOERI" > html/index.html
[student@server1 ~]$ curl localhost:8080
JOERI
[student@server1 ~]$ echo "TEST 123" > html/index.html
[student@server1 ~]$ curl localhost:8080
TEST 123
```

So far so good :)


## Step 2 - Test PHP-FPM
In this step we only install and enable PHP-FPM. If the test fails, then I need to revise my Nginx and/or PHP-FPM pool configuration.
My Nginx configuration file is custom, while I left the default PHP-FPM configuration file in place.

```
[student@server1 ~]$ cat Dockerfile
FROM fedora
MAINTAINER Joeri Smissaert

RUN dnf -y upgrade; dnf -y install nginx php-fpm php-mysqlnd php-pdo php-json; dnf clean all; systemctl enable nginx; systemctl enable php-fpm
RUN mkdir -p /var/www/worpdress.server1.local/public
RUN mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
ADD https://gist.githubusercontent.com/smissaertj/9d02fd974b64fd1a30fd905bc730a098/raw/dee50eb0bea7b93acb6ad0ddb6894cefb74c9d45/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["/sbin/init"]
```

Adjust original Dockerfile with the modifications above, then rebuild the image and run the container:
```
[student@server1 ~]$ podman build -t fedora_wordpress .
...
[student@server1 ~]$ podman run -d --name test -p 8080:80 -v /home/student/html:/var/www/wordpress.server1.local/public:Z fedora_wordpress
...
```

Remove the `html/index.html` file and create an `html/index.php` file with the following content:
```
[student@server1 ~]$ cat html/index.php
<html>
 <head>
  <title>PHP Test</title>
 </head>
 <body>
 <?php echo '<p>Hello World</p>'; ?>
 </body>
</html>
```

When we run a cURL test, we should *not* be seeing the `<?php` and `?>` tags, indicating that our php code was succesfully parsed by PHP-FPM:
```
[student@server1 ~]$ curl localhost:8080
<html>
 <head>
  <title>PHP Test</title>
 </head>
 <body>
 <p>Hello World</p>
 </body>
</html>
```

Yaay! :D


## Step 3 - Test MariaDB
I'll create persistent storage for the database by means of a podman volume:
```
[student@server1 ~]$ podman volume create wordpress_db
wordpress_db

[student@server1 ~]$ podman volume ls
DRIVER      VOLUME NAME
local       wordpress_db
```

Again, we adjust our Dockerfile and rebuild our custom image:
```
FROM fedora
MAINTAINER Joeri Smissaert

RUN dnf -y upgrade; dnf -y install nginx php-fpm php-fpm php-mysqlnd php-pdo php-json mariadb-server; dnf clean all; systemctl enable nginx; systemctl enable php-fpm; systemctl enable mariadb
RUN mkdir -p /var/www/worpdress.server1.local/public
RUN mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
ADD https://gist.githubusercontent.com/smissaertj/9d02fd974b64fd1a30fd905bc730a098/raw/dee50eb0bea7b93acb6ad0ddb6894cefb74c9d45/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["/sbin/init"]
```

We run the container:
```
[student@server1 ~]$ podman run -d --name test -v wordpress_db:/var/lib/mysql:Z fedora_wordpress
...

```

Next, we create the database and configure the database user and password:
```
[student@server1 ~]$ podman exec test mysql -e "create database wordpressdb;"
[student@server1 ~]$ podman exec test mysql -e "grant all privileges on wordpressdb.* to 'wordpress'@'localhost' identified by 'password';"
```

We can now move on to the next step and install WordPress.


## Step 4 - Install WordPress
In this step I'll move away from a bind mounted directory (used during Step 1 and Step 2) to a podman volume to persistently store the WordPress files.
```
[student@server1 ~]$ podman volume create wordpress_files
wordpress_files
[student@server1 ~]$ podman volume ls
DRIVER      VOLUME NAME
local       wordpress_files
local       wordpress_db
[student@server1 ~]$ podman volume inspect wordpress_files
[
     {
          "Name": "wordpress_files",
          "Driver": "local",
          "Mountpoint": "/home/student/.local/share/containers/storage/volumes/wordpress_files/_data",
          "CreatedAt": "2021-04-14T00:25:06.906021271+04:00",
          "Labels": {

          },
          "Scope": "local",
          "Options": {

          },
          "UID": 0,
          "GID": 0,
          "Anonymous": false
     }
]
```
From the last command we can see where exactly the data will be stored:
```
Mountpoint": "/home/student/.local/share/containers/storage/volumes/wordpress_files/_data"
```

I'll go ahead and extract WordPress inside that directory:
```
[student@server1 ~]$ cd ~/.local/share/containers/storage/volumes/wordpress_files/_data/
[student@server1 _data]$ wget https://wordpress.org/latest.tar.gz
...
[student@server1 _data]$ tar xf latest.tar.gz --strip-components 1
[student@server1 _data]$ rm -rf latest.tar.gz
```

Let's start the container and test our installation:
```
[student@server1 ~]$ podman run -d --name wordpress_test_container -p 8080:80 -v wordpress_db:/var/lib/mysql:Z -v wordpress_files:/var/www/wordpress.server1.local/public:Z fedora_wordpress
bc006160ad6b74b81fa3fc353bc0cbb1cec3b394365dc98259984a86c971cd9f
[student@server1 ~]$
```

Testing with cURL seems to go fine:
```
[student@server1 ~]$ curl -I localhost:8080
HTTP/1.1 302 Found
Server: nginx/1.18.0
Date: Tue, 13 Apr 2021 20:34:46 GMT
Content-Type: text/html; charset=UTF-8
Connection: keep-alive
X-Powered-By: PHP/7.4.16
Location: http://localhost:8080/wp-admin/setup-config.php
```

So at this point we have a working WordPress multi-service container :D


### Below is the final version of our Dockerfile:
```
FROM fedora
MAINTAINER Joeri Smissaert

RUN dnf -y upgrade; dnf -y install nginx php-fpm php-fpm php-mysqlnd php-pdo php-json mariadb-server; dnf clean all; systemctl enable nginx; systemctl enable php-fpm; systemctl enable mariadb
RUN mkdir -p /var/www/worpdress.server1.local/public
RUN mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
ADD https://gist.githubusercontent.com/smissaertj/9d02fd974b64fd1a30fd905bc730a098/raw/dee50eb0bea7b93acb6ad0ddb6894cefb74c9d45/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["/sbin/init"]
```

I've pushed the final version of the image I've build to [my Quay.io repository](https://quay.io/repository/smissaertj/fedora_wordpress?tab=info).

As long as we keep the `wordpress_files` and `wordpress_db` volumes, I can destroy the running container and recreate it without any effect on the data:
```
podman run -d --name container_name -p 8080:80 -v wordpress_files:/var/www/wordpress.server1.local/public:Z -v wordpress_db:/var/lib/mysql:Z quay.io/smissaertj/fedora_wordpress
```

Finally, I want my WordPress site to start at boot even when I'm not logging in to my machine as the user which created the container:
```
[student@server1 ~]$ podman ps
CONTAINER ID  IMAGE                              COMMAND     CREATED        STATUS            PORTS                 NAMES
d4fb97ba659d  localhost/fedora_wordpress:latest  /sbin/init  6 minutes ago  Up 6 minutes ago  0.0.0.0:8080->80/tcp  wordpress_test

[student@server1 ~]$ mkdir -p ~/.config/systemd/user
[student@server1 ~]$ cd .config/systemd/user/

[student@server1 user]$ podman generate systemd --name wordpress_test --files --new
/home/student/.config/systemd/user/container-wordpress_test.service

[student@server1 user]$ su - root
Password:
[root@server1 ~]# loginctl enable-linger student
[root@server1 ~]# exit
logout

[student@server1 user]$ systemctl --user daemon-reload
[student@server1 user]$ systemctl --user enable container-wordpress_test.service
Created symlink /home/student/.config/systemd/user/multi-user.target.wants/container-wordpress_test.service → /home/student/.config/systemd/user/container-wordpress_test.service.
Created symlink /home/student/.config/systemd/user/default.target.wants/container-wordpress_test.service → /home/student/.config/systemd/user/container-wordpress_test.service.

[student@server1 user]$ reboot
```

The `--new` option passed to the `podman generate systemd` command will make sure that the container is destroyed when the service stops and recreated when the service starts.
