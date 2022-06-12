---
title: Blocking requests not originating from CloudFlare on Nginx
author: Joeri
date: 2020-01-25T07:36:18+00:00
url: /blocking-requests-not-originating-from-cloudflare-on-nginx/
swp_cache_timestamp:
  - 442624
categories:
  - CloudFlare
  - Linux
  - Nginx
tags:
  - Nginx
  - CloudFlare
---

{{< image src="/img/cf-logo-v-rgb.png" alt="CloudFlare Logo" position="center">}}


My websites are behind [CloudFlare](https://www.cloudflare.com/), which acts as a reverse proxy and which can help in mitigating attacks, malicious traffic and requests.  
  
CloudFlare is masking the real IP address of this site. If you look up the DNS A record for this domain, you'll see one of CloudFlare's IP addresses. Essentially, CloudFlare is forwarding traffic from their servers to the server where my sites are hosted.  
  
The inconvenience of this is that I can't see the real IP address of the visitor, instead, I'm seeing CloudFlare's IP addresses in the Nginx log.  
  
Luckily, [Cloudflare includes the original visitor IP address](https://support.cloudflare.com/hc/en-us/articles/200170786-Restoring-original-visitor-IPs-Logging-visitor-IP-addresses-with-mod-cloudflare-) in the `X-Forwarded-For` and `CF-Connecting-IP` headers. I would only need to make a simple Nginx configuration change, and, with this information, I can also block anyone who happens to know the real IP address my server and could be ypassing CloudFlare. 

Inside `/etc/nginx`, I created an additional configuration file, `cloudflare_ips.conf`, where I map two variables using the [ngx_http_geo_module](http://nginx.org/en/docs/http/ngx_http_geo_module.html). If the remote IP is a  [CloudFlare IP address](https://www.cloudflare.com/ips/), then I set it as allowed. 

```
geo $remote_addr $is_allowed_ip  {
    173.245.48.0/20 yes;
    103.21.244.0/22 yes;
    103.22.200.0/22 yes;
    103.31.4.0/22 yes;
    141.101.64.0/18 yes;
    108.162.192.0/18 yes;
    190.93.240.0/20 yes;
    188.114.96.0/20 yes;
    197.234.240.0/22 yes;
    198.41.128.0/17 yes;
    162.158.0.0/15 yes;
    104.16.0.0/12 yes;
    172.64.0.0/13 yes;
    131.0.72.0/22 yes;
	2400:cb00::/32 yes;
	2606:4700::/32 yes;
	2803:f800::/32 yes;
	2405:b500::/32 yes;
	2405:8100::/32 yes;
	2a06:98c0::/29 yes;
	2c0f:f248::/32 yes;
    default no;
}
```

You can then add the following `if` block into the site's server block configuration. Basically, if the remote IP is not in the list above, the `$is_allowed_ip` variable will be set to `no` and a `403 Forbidden` status code is returned.

```
if ($is_allowed_ip = no ){ return 403; }
```

We shouldn't forget the include the `cloudflare_ips.conf` file inside our main `nginx.conf`. Add the below into the `http` block. 

```
include /etc/nginx/cloudflare_ips.conf;
```

The last step would be to modify the existing log format, so that it includes the real ip address of the visitor, in addition to the CloudFlare IP. The log format can be found in `nginx.conf`. You would need to add the`$http_x_forwarded_for` variable in the `log_format` directive.  
  
Test the Nginx config and reload Nginx to apply the above changes.