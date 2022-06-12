---
title: Serving a Python Flask app with Gunicorn, Nginx and Systemd.
author: Joeri
date: 2019-12-31T08:05:24+00:00
url: /serving-a-python-flask-app-with-gunicorn-nginx-and-systemd/
categories:
  - Linux
  - Python
  - Web
tags:
  - Gunicorn
  - Nginx
  - Python
  - Systemd

---

{{< image src="/img/icons8-python-64.png" alt="Python Logo" position="center">}}


This post explains how to serve a Python app from a [Virtualenv](https://pypi.org/project/virtualenv/) with the Gunicorn WSGI and using Nginx as a proxy server.  
You should already have Nginx installed, and have a sample Flask app in a Virtualenv.

### Install Gunicorn in your Virtualenv

Activate your Virtualenv and install Gunicorn by typing:

```  bash
$ source myprojectenv/bin/activate
(myprojectenv)$ pip install gunicorn
```

### Creating the WSGI Entry Point

Next, we'll create a file called _wsgi.py_ that will serve as the entry point for our application code in _app.py_.

```  bash
(myprojectenv)$ nano wsgi.py
```

We'll import the Flask application code from _app.py_ inside the entry point file:

```  python
from app import app

if name == "main":
     app.run()
```

Save and close the file.

### Testing Gunicorn

We should check that Gunicorn can serve the application correctly.  
  
We can do this by simply passing the _gunicorn_ command the name of our entry point. This is the name of the entry point file (minus the .py extension), plus the name of the application. In this case, this is _wsgi:app_.  
  
We’ll also specify a publicly available interface and port to bind to:

```  bash
(myprojectenv)$ gunicorn --bind 0.0.0.0:5000 wsgi:app
```

You'll see similar output as:

```  bash
Jan 03 22:13:26 odin gunicorn[347]: [2020-01-03 22:13:26 +0400] [347] [INFO] Starting gunicorn 19.9.0
Jan 03 22:13:26 odin gunicorn[347]: [2020-01-03 22:13:26 +0400] [347] [<code>INFO] Listening at: http://0.0.0.0:5000 (28217)
Jan 03 22:13:26 odin gunicorn[347]: [2020-01-03 22:13:26 +0400] [347] [INFO] Using worker: sync
Jan 03 22:13:26 odin gunicorn[347]: [2020-01-03 22:13:26 +0400] [367] [INFO] Booting worker with pid: 367
```

Visit your server’s IP address with `:5000` appended to the end in your web browser to see your application:

```
http://your_server_ip:5000
```

When you have confirmed that it’s functioning properly, press `CTRL-C` in your terminal window and deactivate the virtual environment.

```  bash
(myprojectenv)$ deactivate
```

### Creating the Systemd Script

A Systemd service unit file will allow the OS's init system to automatically start Gunicorn and serve the Flask application whenever the server boots.  
  
Let's begin by creating a service unit file within the `/etc/systemd/system` directory:

```  bash
$ sudo nano /etc/systemd/system/myproject.service
```

We'll add the `[Unit]` section which contains a description of the service and we'll only allow this service to start if required network services are running as well.

```
[Unit]
Description=Gunicorn instance to serve myproject
After=network.target
```

In the `[Service]` section we'll specify the user and group we want our process to be running under. I'm specifying my own username since it owns all of the files. So that Nginx can communicate with the Gunicorn processes, we'll give group ownership to the _www-data_ group. 

```  bash
[Service]
User=joeri
Group=www-data
```

Next, let’s map out the working directory and set the `PATH` environmental variable so that the init system knows that the executables for the process are located within our virtual environment. Let’s also specify the command to start the service. This command will do the following:

  * Start 3 worker processes
  * Create and bind to a Unix socket file, `myproject.sock`, within our project directory. We’ll set an umask value of `007`&nbsp;so that the socket file is created giving access to the owner and group, while restricting access to others. 
  * Specify the WSGI entry point file name, along with the Python callable within that file (`wsgi:app`)

Systemd requires that we give the full path to the Gunicorn executable, which is installed within our virtual environment.

```  bash
WorkingDirectory=/home/joeri/www/myproject
Environment="PATH=/home/joeri/www/myproject/myprojectenv/bin"
ExecStart=/home/joeri/www/myproject/myprojectenv/bin/gunicorn --workers 3 --bind unix:myproject.sock -m 007 wsgi:app
```

Next, we want this service to start when the system boots up in multi-user mode with networking: multi-user.target  
We do this by adding the [Install] section and specifying the target. 

```  bash
[Install]
WantedBy=multi-user.target
```

Our complete service unit file should look like the below:

```  bash
[Unit]
Description=Gunicorn instance to serve myproject
After=network.target

[Service]
User=joeri
Group=www-data
WorkingDirectory=/home/joeri/www/myproject
Environment="PATH=/home/joeri/www/myproject/myprojectenv/bin"
ExecStart=/home/joeri/www/myproject/myprojectenv/bin/gunicorn --workers 3 --bind unix:myproject.sock -m 007 wsgi:app

[Install]
WantedBy=multi-user.target
```

We can now start our service and enable it at boot time:

```  bash
$ sudo systemctl start myproject 
$ sudo systemctl enable myproject
```

### Proxy requests with Nginx

We can now configure Nginx to pass web requests to that socket by making some small additions to the nginx configuration file.  
  
Verify if the `/etc/nginx/proxy_params` file exists. If not, create it with the following content:

```
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
client_max_body_size 100M;
client_body_buffer_size 1m;
proxy_intercept_errors on;
proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 256 16k;
proxy_busy_buffers_size 256k;
proxy_temp_file_write_size 256k;
proxy_max_temp_file_size 0;
proxy_read_timeout 300;
```

Create a new Nginx configuration file for your application and add the below lines to it:

```
sudo nano /etc/nginx/sites-available/myproject.conf

server {
     listen 80;
     server_name your_domain www.your_domain;

     location / {
         include proxy_params;
         proxy_pass http://unix:/home/joeri/www/myproject/myproject.sock;
     }
 }
 ```

Save and close the file when you’re finished.



To enable the Nginx server block configuration you’ve just created, link the file to the sites-enabled directory:

```  bash
sudo ln -s /etc/nginx/sites-available/myproject /etc/nginx/sites-enabled
```

With the file in that directory, you can test for syntax errors:

```  bash
$ sudo nginx -t
```

If no errors are returned, restart the Nginx process to read the new configuration:

```  bash
$ sudo systemctl restart nginx
```

You should now be able to navigate to your server’s domain name in your web browser and see your application's output. In the next post I'll set up SSL for this application.
