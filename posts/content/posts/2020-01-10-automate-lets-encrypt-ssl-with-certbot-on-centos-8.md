---
title: Automate Let’s Encrypt SSL with Certbot on Centos 8
author: Joeri
date: 2020-01-10T08:30:48+00:00
url: /automate-lets-encrypt-ssl-with-certbot-on-centos-8/
swp_cache_timestamp:
  - 442552
categories:
  - CentOS
  - SSL
tags:
  - Nginx
  - CentOS

---

{{< image src="/img/le-logo-wide.png" alt="Let's Encrypt Logo" position="center">}}

An SSL Certificate is a text file with encrypted data that you install on your server so that you can secure/encrypt sensitive communications between your site and your visitors. They are also used to verify that you are connected with the service you wish to be connecting with, and, as a website owner it validates your trustworthiness.

SSL certificates can be expensive, so here's where [Let&#8217;s Encrypt](https://letsencrypt.org/about/) comes into play. 

>Let’s Encrypt is a free, automated, and open certificate authority (CA), run for the public’s benefit. It is a service provided by the [Internet Security Research Group (ISRG](https://www.abetterinternet.org): _We give people the digital certificates they need in order to enable HTTPS (SSL/TLS) for websites, for free, in the most user-friendly way we can. We do this because we want to create a more secure and privacy-respecting Web._

In order to have Let's Encrypt issue a valid certificate for your site, it needs to validate your domain. In other words, it needs to make sure that whoever is requesting the certificate is also in full control of the domain name it's being issued for. 

There are different ways you can prove you're the owner of a specific domain:

  * Provisioning a DNS record under&nbsp;`example.com`, or
  * Provisioning an HTTP resource under a well-known URI on&nbsp;`http://example.com/`

The first method is done by manually adding a specific DNS record to your domain. The latter is done automatically by the Let's Encrypt agent on your server.

In this guide, we'll be using the second method with `certbot` to install an SSL certificate in a matter of minutes. This method requires that your domain is pointing to the server you're running `certbot` on with its DNS. 

>[Certbot](https://certbot.eff.org/about/) is a free, open source software tool for automatically using Let’s Encrypt certificates on manually-administrated websites to enable HTTPS.

First, let's download `certbot`, copy it into our `PATH` and apply the necessary permissions:

```
# wget https://dl.eff.org/certbot-auto 
# mv certbot-auto /usr/local/bin/certbot-auto 
# chown root /usr/local/bin/certbot-auto 
# chmod 0755 /usr/local/bin/certbot-auto
```

When you run `certbot-auto --nginx`, certbot will look into your Nginx configuration files for domains it can request an SSL certificate for. You'll be presented with a menu:

{{< image src="/img/certbot-1.png" alt="Certbot menu" position="center">}}


Enter the numbers of the domains you wish to generate an SSL certificate for, separated by commas or spaces and hit ENTER. Or leave the input blank to select all domains. <figure class="wp-block-image size-large">

{{< image src="/img/certbot-2.png" alt="Certbot menu" position="center">}}

Choose if you wish to have the webserver enforce HTTPS traffic (option 2) or not (option 1). 

You now have a valid SSL certificate on for your domain: 

{{< image src="/img/certbot-3.png" alt="Certbot menu" position="center">}}

Check your Nginx configuration to see what exactly was added by Certbot.