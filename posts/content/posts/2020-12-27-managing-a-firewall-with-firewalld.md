---
title: "Managing a Firewall with Firewalld"
date: 2020-12-27
url: /managing-a-firewall-with-firewalld
toc: false
draft: false
images:
tags:
  - RHEL
  - Security
  - Firewall
  - firewalld service
---

{{< figure class="center" src="/img/redhat-8-logo.png" alt="Red Hat logo">}}
{{< figure class="center" src="/img/firewalld.png" alt="Firewalld logo" width="200px">}}


# Understanding Linux Firewalling

Firewalling is implemented in the Linux kernel by means of the [netfilter](http://www.netfilter.org/) subsystem to limit traffic coming in to a server or going out of the server. Netfilter allows kernel modules to inspect every incoming, outgoing, or forwarded packet and act upon it by either allowing it or blocking it. In essence, netfilter controls access to and from the network stack at the Linux kernel module level.

Iptables was the default solution to interact with netfilter, it provides a sophisticated way of defining firewall rules but it's also challenging to use due to the complicated syntax and the ordering of rules which can become complex. The iptables service is no longer offered in RHEL8, it has been replaced with **nftables**, a new solution with more advanced options.


## Firewalld

Firewalld is a higher-level netfilter implementation that is more user-friendly compared to iptables or nftables. While administrators can manage the Firewalld rules, applications can also communicate with it using the DBus messaging system: rules can be added or removed without any direct action required from the system administrator. Applications can address the firewall from user space. 

> Firewalld applies rules to incoming packets only by default, no filtering happens on outgoing packets.

### Firewalld Zones

Firewalld makes management easier by working with *zones*. A zone is a collection of rules that are applied to incoming packets matching a specific source address or network interface. 

The use of zones is import on servers that have multiple network interfaces. Each interface could be a different zone where different rules would apply. On a machine with only one network interface you can work with one zone, the *default* zone. 

Every packet that comes into a system is analyzed for its source address, based on the source address Firewalld decides if it belongs to a specific zone. If not, the zone for the incoming network interface is used. If no specific zone is available, the packet is handled by the rules in the *default* zone. 

{{<table "table table-dark table-striped table-bordered">}}
Zone Name | Description
-----|----
block | Incoming network connections are rejected with the "icmp-host-prohibited" message. Connections that were initiated on this system are allowed.
dmz | For use on computers in the demilitarized zone. Selected incoming connections are accepted, and limited access to the internal network is allowed.
drop | Any incoming packets are dropped and there is no reply.
external | For use on external networks with masquarading (Network Address Translation) enabled, used on routers. Selected incoming connections are accepted.
home | Most computers on the same network are trusted, only selected incoming connections are accepted.
internal| Most computers on the same network are trusted, only selected incoming connections are accepted.
public | Other computers on the same network are not trused, limited connections are accepted. This is the *default* zone for all newly created network interfaces.
trusted | All network connections are accepted.
work | Most computers on the same network are trusted, only selected incoming connections are accepted.
{{</table>}}


### Firewalld Services

Services are the second key element while working with Firewalld.
A service in Firewalld is not the same as a service in systemd. A Firewalld service defines what exactly should be accepted as incoming traffic in the firewall, it includes ports to be opened and supoorting kernel modules that should be loaded. 

Behind each service is an XML configuration file that explains which TCP or UDP ports are involved and, if required, what kernel modules must be loaded.  Default (RPM installed) XML files are stored in `/usr/lib/firewalld/services` while custom XML files can be added to the `/etc/firewalld/services` directory.

```
[root@localhost ~]# firewall-cmd --get-services
RH-Satellite-6 amanda-client amanda-k5-client amqp amqps ...
...


[root@localhost ~]# cat /usr/lib/firewalld/services/ftp.xml 
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>FTP</short>
  <description>FTP is a protocol used for remote file transfer. If you plan to make your FTP server publicly available, enable this option. You need the vsftpd package installed for this option to be useful.</description>
  <port protocol="tcp" port="21"/>
  <helper name="ftp"/>
</service>
```

## Working with Firewalld

Firewalld provides a command-line interface tool that works with a runtime and permament (on-disk) configuration state: **firewall-cmd**

Below is an example of how you can use the tool to retrieve current settings and make configuration changes. Always make sure to commit changes to disk using the `--permanent` flag so that your changes survive a reboot, then `--reload` to apply the changes to the runtime environment.

```
[root@localhost ~]# firewall-cmd --get-default-zone
public

[root@localhost ~]# firewall-cmd --get-zones
block dmz drop external home internal libvirt public trusted work

[root@localhost ~]# firewall-cmd --list-all --zone=public
public (active)
  target: default
  icmp-block-inversion: no
  interfaces: enp1s0
  sources: 
  services: cockpit dhcpv6-client ftp http https ssh
  ports: 
  protocols: 
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
  rich rules:

[root@localhost ~]# firewall-cmd --get-services
RH-Satellite-6 amanda-client amanda-k5-client amqp amqps apcupsd audit bacula bacula-client bb bgp bitcoin bitcoin-rpc bitcoin-testnet
...

[root@localhost ~]# firewall-cmd --list-services
cockpit dhcpv6-client ftp http https ssh
	
[root@localhost ~]# firewall-cmd --add-service=vnc-server --permanent
success

[root@localhost ~]# firewall-cmd --list-services
cockpit dhcpv6-client ftp http https ssh

[root@localhost ~]# firewall-cmd --reload
success

[root@localhost ~]# firewall-cmd --list-services
cockpit dhcpv6-client ftp http https ssh vnc-server

[root@localhost ~]# firewall-cmd --add-port=2022/tcp --permanent
success

[root@localhost ~]# firewall-cmd --reload
success

[root@localhost ~]# firewall-cmd --list-all
public (active)
  target: default
  icmp-block-inversion: no
  interfaces: enp1s0
  sources: 
  services: cockpit dhcpv6-client ftp http https ssh vnc-server
  ports: 2022/tcp
  protocols: 
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
  rich rules: 
``` 

#### Key Commands
```
firewall-cmd --list-all
firewall-cmd --list-all --zone=public

firewall-cmd --get-default-zone
firewall-cmd --get-zones

firewall-cmd --get-services
firewall-cmd --list-services

firewall-cmd --add-service ftp
irewall-cmd --add-service ftp --permanent
firewall-cmd --reload

firewall-cmd --add-port=2022/tcp --permanent
firewall-cmd --reload
```


