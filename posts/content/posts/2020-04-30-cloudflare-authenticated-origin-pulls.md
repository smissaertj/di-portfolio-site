---
title: CloudFlare Authenticated Origin Pulls
author: Joeri
date: 2020-04-30T16:57:40+00:00
url: /cloudflare-authenticated-origin-pulls/
swp_cache_timestamp:
  - 442552
categories:
  - CloudFlare
  - Linux
  - Nginx
  - SSL
tags:
  - Authenticated Origin Pulls
  - CloudFlare
  - SSL
  - TLS
  - TLS Authentication

---
{{< image src="/img/cf-logo-v-rgb.png" alt="CloudFlare Logo" position="center">}}


In addition to [my previous post](/blocking-requests-not-originating-from-cloudflare-on-nginx) on blocking requests that are hitting my websites directly without going through the CloudFlare network, we can enable the Authenticated Origin Pulls feature. 

Authenticated Origin Pulls uses TLS Authentication to verify that the server hosting my website is communicating with CloudFlare and not some other server or client.  
  
Nginx will be configured to only accept requests which use a valid client certificate from Cloudflare and requests which have not passed through CloudFlare will be dropped: The server will respond with a 400 Bad Request status code.

{{< image src="/img/http_400.png" alt="CloudFlare Logo" position="center">}}


Let's start by downloading the CloudFlare origin _pull_ certificate from [here](https://support.cloudflare.com/hc/en-us/article_attachments/360044928032/origin-pull-ca.pem), and put it in an appropriate location. I've renamed the certificate to `cloudflare.crt`.

```
# cd /etc/ssl/certs
# wget https://support.cloudflare.com/hc/en-us/article_attachments/360044928032/origin-pull-ca.pem
# mv origin-pull-ca.pem cloudflare.crt
```

Next, we need to specify where Nginx can find this certificate in our Nginx configuration Server block. Add the following to your server block after your already existing `ssl_certificate` and `ssl_certificate_key` directives:

```
ssl_client_certificate /etc/ssl/certs/cloudflare.crt;
ssl_verify_client on;
```

The configuration should look similar to this:

```
ssl on;
ssl_certificate /etc/ssl/certs/website.pem;
ssl_certificate_key /etc/ssl/private/website_privatekey.pem;
ssl_client_certificate /etc/ssl/certs/cloudflare.crt;
ssl_verify_client on;
```

Save the file and exit the text editor.  
Test the configuration changes by executing:

```
# nginx -t
```

If there were no problems, go ahead and apply the configuration by reloading Nginx:

```
# nginx -s reload
```

If you visit the website now, you should see the _400 Bad Request_ error. That means everything is working as intended and as a final step we will need to enable the Authenticated Origin Pulls feature in CloudFlare.  
  
Open the _SSL/TLS_ section in the Cloudflare dashboard, head to the _Origin Server_ subsection and toggle the _Authenticated Origin Pulls_ option to _On_.

{{< image src="/img/cd_originpulls.png" alt="CloudFlare Authenticated Origin Pull Setting" position="center">}}

Authenticated Origin Pulls on the Nginx server is now set up correctly to ensure that Nginx only accepts requests from Cloudflare’s servers, preventing anyone else from directly connecting to the Nginx server.

### Optional

While I was implementing this I decided to replace my Let's Encrypt certificates with CloudFlare's Origin Certificate (not origin pull certificate).  
  
Origin Certificates are only valid for encryption between Cloudflare and the origin server, but that's okay since Authenticated Origin Pulls only allows traffic going through CloudFlare to connect to my server anyway.  
  
You can create or download the Origin Certificate in the same section where you enabled Authenticated Origin Pulls. 

{{< image src="/img/cf_origincerts-1.png" alt="CloudFlare Origin Certificate" position="center">}}


If you don't have the private key, you will need to create a new certificate and either provide your own private key and CSR, or let CloudFlare generate both for you.

{{< image src="/img/cf_origincerts_create.png" alt="Create CloudFlare Origin Certificate" position="center">}}


On the next screen, choose the PEM format and copy the content of the Origin Certificate section to a file called `yourdomain.com.pem` and the content of the private key section to a file called `yourdomain.com.key`.  
  
Upload both files to your server and place them in the following paths:  
`/etc/ssl/certs/yourdomain.com.pem`  
`/etc/ssl/private/yourdomain.com.key`

Just like before, we need to tell Nginx where to find those files:

```
ssl on;
ssl_certificate /etc/ssl/certs/yourdomain.com.pem;
ssl_certificate_key /etc/ssl/private/yourdomain.com.key;
ssl_client_certificate /etc/ssl/certs/cloudflare.crt;
ssl_verify_client on;
```

Test and reload the Nginx configuration.