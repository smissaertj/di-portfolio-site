---
title: "Network Services - Managing Apache HTTP"
date: 2020-11-09
url: /network-services-managing-apache-http
toc: false
draft: false
images:
tags:
  - RHEL
  - Network services
  - Apache
  - httpd
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}
{{< image src="/img/apache.png" alt="Apache logo" position="center" >}}


Managing Apache HTTP Services is not part of the current RHCSA exam objectives, but we need minimal knowledge on this topic in order to master the SELinux-related objectives later on. 

The Apache server is provided through different software packages. The basic packages is `httpd` which contains everything for an operational but basic website. For a complete overview of all the packages use `yum search httpd`. 


# Understanding the httpd Package
Let's examine the `httpd` package by downloading it using `yumdownloader` and running a few rpm commands on it:
```
[root@localhost ~]# yumdownloader httpd
Last metadata expiration check: 0:00:31 ago on Tue 06 Oct 2020 11:05:52 AM EST.
[root@localhost ~]# ls
anaconda-ks.cfg  httpd-2.4.37-21.module_el8.2.0+382+15b0afa8.x86_64.rpm  initial-setup-ks.cfg
[root@localhost ~]# rpm -qpi httpd-2.4.37-21.module_el8.2.0+382+15b0afa8.x86_64.rpm 
Name        : httpd
Version     : 2.4.37
Release     : 21.module_el8.2.0+382+15b0afa8
Architecture: x86_64
Install Date: (not installed)
Group       : System Environment/Daemons
Size        : 5105105
License     : ASL 2.0
Signature   : RSA/SHA256, Mon 08 Jun 2020 05:08:58 PM EDT, Key ID 05b555b38483c65d
Source RPM  : httpd-2.4.37-21.module_el8.2.0+382+15b0afa8.src.rpm
Build Date  : Mon 08 Jun 2020 04:15:29 PM EDT
Build Host  : x86-02.mbox.centos.org
Relocations : (not relocatable)
Packager    : CentOS Buildsys <bugs@centos.org>
Vendor      : CentOS
URL         : https://httpd.apache.org/
Summary     : Apache HTTP Server
Description :
The Apache HTTP Server is a powerful, efficient, and extensible
web server.
[root@localhost ~]#
```

We can see the package was created by CentOS Buildsys and that it is indeed the Apache HTTP Server package.
Next, let's have a look at the configuration files:

```
[root@localhost ~]# rpm -qpc httpd-2.4.37-21.module_el8.2.0+382+15b0afa8.x86_64.rpm 
/etc/httpd/conf.d/autoindex.conf
/etc/httpd/conf.d/userdir.conf
/etc/httpd/conf.d/welcome.conf
/etc/httpd/conf.modules.d/00-base.conf
/etc/httpd/conf.modules.d/00-dav.conf
/etc/httpd/conf.modules.d/00-lua.conf
/etc/httpd/conf.modules.d/00-mpm.conf
/etc/httpd/conf.modules.d/00-optional.conf
/etc/httpd/conf.modules.d/00-proxy.conf
/etc/httpd/conf.modules.d/00-systemd.conf
/etc/httpd/conf.modules.d/01-cgi.conf
/etc/httpd/conf/httpd.conf
/etc/httpd/conf/magic
/etc/logrotate.d/httpd
/etc/sysconfig/htcacheclean
[root@localhost ~]# 
```

The main configuration file is `/etc/httpd/conf/httpd.conf`. The `welcome.conf` file defines the default home page for your website, until you add content. The `magic` file defines rules that the server can use to figure out a file's type when the server tries to open it. The `/etc/logrotate.d/httpd` file defines how log files produced by Apache are rotated.

Most Apache modules put their configuration files into the  `/etc/httpd/conf.d` directory but some may drop their configuration files into the `/etc/httpd/conf.modules.d/` directory. Any file in those directories that ends with the `.conf` extension is included in the main `httpd.conf` file and used to configure Apache.


# Setting Up a Basic Web Server
Let's install the `httpd` package and some of the most commonly used additional packages using the `yum module install httpd` command:

```
[root@localhost ~]# yum module install httpd
...
...
Installed:
  apr-1.6.3-9.el8.x86_64                                                    apr-util-1.6.1-6.el8.x86_64                                          apr-util-bdb-1.6.1-6.el8.x86_64                                  
  apr-util-openssl-1.6.1-6.el8.x86_64                                       centos-logos-httpd-80.5-2.el8.noarch                                 httpd-2.4.37-21.module_el8.2.0+382+15b0afa8.x86_64               
  httpd-filesystem-2.4.37-21.module_el8.2.0+382+15b0afa8.noarch             httpd-tools-2.4.37-21.module_el8.2.0+382+15b0afa8.x86_64             mod_http2-1.11.3-3.module_el8.2.0+307+4d18d695.x86_64            
  mod_ssl-1:2.4.37-21.module_el8.2.0+382+15b0afa8.x86_64                   

Complete!
```

Open the main configuration file, `/ect/httpd/conf/httpd.conf`, and look for the `DocumentRoot` parameter.
This parameter specifies the default location where the Apache Web Server looks for content to serve. It should be set to `DocumentRoot "/var/www/html"`.
In the directory `/var/www/html`, create a file with the name `index.html` and the content `Welcome To My Web Server!`. Next, start and enable the `httpd` service and check if the service is up and running. 

```
[root@localhost ~]# echo "Welcome To My Webserver!" > /var/www/html/index.html
[root@localhost ~]# 
[root@localhost ~]# systemctl enable --now httpd
Created symlink /etc/systemd/system/multi-user.target.wants/httpd.service → /usr/lib/systemd/system/httpd.service.
[root@localhost ~]# 
[root@localhost ~]# systemctl status httpd
● httpd.service - The Apache HTTP Server
   Loaded: loaded (/usr/lib/systemd/system/httpd.service; enabled; vendor preset: disabled)
   Active: active (running) since Tue 2020-10-06 11:28:24 EST; 3s ago
     Docs: man:httpd.service(8)
 Main PID: 33293 (httpd)
   Status: "Started, listening on: port 443, port 80"
    Tasks: 213 (limit: 11323)
   Memory: 17.8M
   CGroup: /system.slice/httpd.service
           ├─33293 /usr/sbin/httpd -DFOREGROUND
           ├─33296 /usr/sbin/httpd -DFOREGROUND
           ├─33298 /usr/sbin/httpd -DFOREGROUND
           ├─33299 /usr/sbin/httpd -DFOREGROUND
           └─33301 /usr/sbin/httpd -DFOREGROUND

Oct 06 11:28:24 localhost.localdomain systemd[1]: Starting The Apache HTTP Server...
Oct 06 11:28:24 localhost.localdomain httpd[33293]: AH00558: httpd: Could not reliably determine the server's fully qualified domain name, using localhost.localdomain. Set the 'ServerName' directive globally to >
Oct 06 11:28:24 localhost.localdomain systemd[1]: Started The Apache HTTP Server.
Oct 06 11:28:24 localhost.localdomain httpd[33293]: Server configured, listening on: port 443, port 80
```

When the `httpd` service starts, five `httpd` daemon processes are launched by default to respond to requests for the web server. You can configure more or fewer daemons to be started based on settings in the main configuration file. 

We can verify it's working by making an http request to localhost using `curl`:
```
[root@localhost ~]# curl http://localhost
Welcome To My Webserver!
```

# Creating Apache Virtual Hosts
Apache supports the creation of separate websites within a single server. Individual sites are configured in what we refer to as *virtual hosts* which is just a way to have the content for multiple domain names available from the same Apache server. The content that is served to a web client is based on the (domain) name used to access the server.

For example, if a client got to the server by requesting the name `www.example.org`, he would be redirected to a virtual host container that has its `ServerName` parameter set to `www.example.org`.

Name-based virtual hosting is the most common solution where virtual hosts use different names but the same IP address.
IP-based virtual hosts are less common but is required if the name of a web server must resolve to a unique IP address. This solution requires multiple IP addresses on the same machine.

In this section we'll be setting up name-based virtual hosts. 

> If your Apache server is configured for virtual hosts, all sites it's hosting should be handled by virtual hosts. If someone accesses the server via IP address or a name that is not set in a virtual host then the first virtual host is used as the default location to serve up content.  
You can create a catch-all entry for those requests by creating a virtual host for `_default:80`. 

Create a file named `example.org.conf` in `/etc/httpd/conf.d/` using the following template:
```
<VirtualHost *:80>

	ServerAdmin	webmaster@example.org
	ServerName	example.org
	ServerAlias www.example.org
	DocumentRoot /var/www/html/example.org/

DirectoryIndex index.php index.html index.htm
</VirtualHost>
```

This example includes the following settings:
* The `*:80` specification indicates to what address and port this virtual host applies. If your machine has multiple IP addresses, you can replace the `*` with an IP. The port is optional but should always be used to prevent interference with SSL virtual hosts (which use port 443).
* The `ServerName` and `ServerAlias` lines tell Apache which names this virtual host should be recognized as. You can either leave out `ServerAlias` or specify more than one name on the same line, space separated. 
* The `DocumentRoot` specifies where the content for this virtual host is stored.
* The `DirectoryIndex` directive sets the list of files to look for and serve when the web server receives a request.


Create the `index.html` file inside the `DocumentRoot` with the following content: `Welcome To Example.org`
```
[root@localhost conf.d]# mkdir /var/www/html/example.org
[root@localhost conf.d]# echo "Welcome To Example.org" > /var/www/html/example.org/index.html
```

Create a second virtual host with different values, e.g.:
```
[root@localhost conf.d]# cat foobar.com.conf 
<VirtualHost *:80>

	ServerAdmin	webmaster@foobar.com
	ServerName	foobar.com
	ServerAlias	www.foobar.com
	DocumentRoot 	/var/www/html/foobar.com/

DirectoryIndex index.php index.html index.htm
</VirtualHost>

[root@localhost conf.d]# mkdir /var/www/html/foobar.com
[root@localhost conf.d]# echo "Welcome to Foobar.com!" > /var/www/html/foobar.com/index.html
[root@localhost conf.d]#
```

Next we want to make sure that the domains used in our virtual hosts resolve to our local machine and not to the internet. Edit your hosts file and add the domains to the line that starts with the local loopback address:
```
[root@localhost conf.d]# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4 foobar.com www.foobar.com example.org www.example.org
```

After we restarted the `httpd` service, we can test if our setup is working correctly:
```
[root@localhost conf.d]# systemctl restart httpd
[root@localhost conf.d]# curl http://foobar.com
Welcome to Foobar.com!
[root@localhost conf.d]# curl http://example.org
Welcome To Example.org
```


This covered some Apache basics which we will need for testing advanced topics like firewall configuration and SELinux.