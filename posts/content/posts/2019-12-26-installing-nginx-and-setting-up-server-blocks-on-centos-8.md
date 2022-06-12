---
title: Installing Nginx and Setting up Server Blocks on CentOS 8
author: Joeri
date: 2019-12-26T08:29:00+00:00
url: /installing-nginx-and-setting-up-server-blocks-on-centos-8/
categories:
  - CentOS
  - Nginx
tags:
  - Nginx
  - CentOS
---

{{< image src="/img/centos-logo-light.png" alt="CentOS Logo" position="center">}}

In this post, I'll walk through how to install Nginx and set up Nginx server blocks on CentOS 8, and, how to serve different content to different visitors depending on which domains they are requesting.

After initially installing CentOS, check if updates are available and apply them:

```
$ sudo dnf update -y
```

## firewalld

Next, let's install the _firewalld_ daemon to secure the server, start the daemon and enable it at boot. We'll also configure the firewall daemon to only allow requests over the http and https protocols. 

```
$ sudo dnf install -y firewalld
$ sudo systemctl start firewalld
$ sudo systemctl enable firewalld
$ sudo firewall-cmd --zone=public --permanent --add-service=http
$ sudo firewall-cmd --zone=public --permanent --add-service=https
$ sudo firewall-cmd --reload
```

## Install Nginx

We'll proceed with installing Nginx, starting the server and enabling the service at boot:

```
$ sudo dnf install -y nginx
$ sudo systemctl start nginx
$ sudo systemctl enable nginx
```

We can run the following cURL command to test the service:

```
$ curl http://localhost
```

You should see the HTML code of the Nginx test page, confirming that the service is running.

## Creating directory structures for different websites

The example configuration in this guide will make one server block for _example.com_ and another for _example2.com_.  
We'll configure DNS for these dummy domains locally in the `/etc/hosts` file. 

First, we need to make a directory structure that will hold the site data to serve to visitors:

```
$ sudo mkdir -p /var/www/example.com
$ sudo mkdir /var/www/example2.com
```

We now need to modify permissions on these directories so our regular user can make modifications to the files inside, and so that Nginx can read the files as well.

```
$ sudo chown -R joeri:nginx /var/www/example.com
$ sudo chown -R joeri:nginx /var/www/example2.com
```

We'll also ensure read access for the user and group to the `/var/www/` directory and all files and directories inside:

```
$ sudo chown -R 755 /var/www
```

## Creating Demo Pages

We need to create some content for Nginx to serve to visitors. We can do that by creating a simple HTML file inside the directories we previously created. As a regular user, create the HTML file and add your content:

```
$ nano /var/www/example.com/index.html
<html> 
  <body>
   <h1>Welcome To Example.com</h1>
  </body>
</html>
```

Save and exit, then do the same for /var/www/_example2.com_, replacing the content of the h1 element with _&#8220;Welcome To Example2.com&#8221;_. 

## Creating & Enabling the Server Block Files

Server block files specify the configuration of our separate sites and tell the Nginx web server how to respond to various domain requests.  
  
I'll start by replicating the Ubuntu/Debian directory structure for Nginx server block files since I really like that method. 

```
$ sudo mkdir /etc/nginx/sites-available
$ sudo mkdir /etc/nginx/sites-enabled
```

Next, we tell Nginx to look for server blocks in the `sites-enabled` directory. Add the following line to the end of the `http {}` block in _/etc/nginx/nginx.conf_:

```
include /etc/nginx/sites-enabled/*.conf;
```

Create the server block for the example.com site in the _/etc/nginx/sites-available/example.com.conf_ file:

```
$ sudo nano /etc/nginx/sites-available/example.com.conf
```

Add the following lines to the file:

```
server {
    listen  80;
    server_name example.com www.example.com;

    location / {
        root  /var/www/example.com/html;
        index  index.html index.htm;
        try_files $uri $uri/ =404;
    }

    error_page  500 502 503 504  /50x.html;
    location = /50x.html {
        root  /usr/share/nginx/html;
    }
}
```

Do the same for the _example2.com_ site, replacing _example.com_ with _example2.com_. 

We can now enable both server block files by creating a symlink to the _/etc/nginx/sites-enabled_ directory:  


```
$ sudo ln -s /etc/nginx/sites-available/example.com.conf /etc/nginx/sites-enabled/example.com.conf

$ sudo ln -s /etc/nginx/sites-available/example2.com.conf /etc/nginx/sites-enabled/example2.com.conf
```

Test and restart Nginx to make the changes take effect.

```
$ sudo nginx -t
$ sudo systemctl restart nginx
```

## Creating DNS entries

We have two dummy domains, but they aren't pointing to our Nginx server with their DNS. You can create a local DNS entry for those domains in _/etc/hosts_. I'm doing this locally on the machine that's running the webserver:

```
$ sudo nano /etc/hosts
127.0.0.1 localhost example.com www.example.com example2.com www.example2.com
```

On a remote (Linux) machine you would add an additional line, starting with the IP address of your server:

```
192.168.100.99 example.com www.example.com example2.com www.example2.com
```

Our machine can now resolve those domains to a specific server. 

## Testing results

Now that DNS is in place, we can run some tests. Either with cURL or by opening the domains in your browser. 

```
$ curl http://example.com
$ curl http://example2.com
```

You should see different outputs depending on the domain that was called. 

If you keep seeing a 403 Forbidden error, and, you have SELinux enabled, you will want to relabel the `/var/www/` directory with the appropriate SELinux context label:

```
$ sudo restorecon -Rv /var/www/
```