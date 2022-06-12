---
title: Validating Network Configuration on Red Hat Enterprise Linux 8
author: Joeri
date: 2020-05-18T17:33:16+00:00
url: /validating-network-configuration-on-red-hat-enterprise-linux-8/
categories:
  - CentOS
  - Red Hat Enterprise Linux
tags:
  - centos8
  - network validation
  - rhel8

---
{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


Networking is one of the essential items on a server. On Red Hat Enterprise Linux 8, networking is managed by the NetworkManager service. We'll cover new tools that were introduced to help manage networks during runtime and how to make make the configuration persistent.



## Validating Network Addresses and Interfaces

In RHEL 8, the default names for network cards are based on firmware, device topology, and device firmware. Network card names will always consist of the following parts:

  * Ethernet interfaces begin with _en,_ WLAN interfaces begin with _wl_ and WWAN interfaces begin with _ww_
  * The next part of the name represents the type of adapter.  
    An _o_ is used for onboard, _s_ for hotplug slot, _p_ for PCI location.
  * A number is used to represent an index, ID or port.

e.g. _enp3p1_ would indicate an ethernet device on PCI slot 3, port 1.  
Apart from this default device naming scheme, BIOS device naming can be used as well if the _biosdevname_ package is installed.



### Validating Network Address Configuration

To verify the runtime configuration of the network, we can use the `ip` utility. We can use this utility to monitor many aspects of networking:

  * `ip addr` to show and configure network addresses
  * `ip route` to show and configure routing information
  * `ip link` to show and configure network link state

We can use the `ip addr show` command to show the current network settings:

```
[student@server1 ~]$ ip addr show
1: lo: mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
inet 127.0.0.1/8 scope host lo
valid_lft forever preferred_lft forever
inet6 ::1/128 scope host
valid_lft forever preferred_lft forever
2: ens1: mtu 1500 qdisc fq_codel state UP group default qlen 1000
link/ether 52:54:00:d4:91:88 brd ff:ff:ff:ff:ff:ff
inet 192.168.122.237/24 brd 192.168.122.255 scope global dynamic noprefixroute ens1
valid_lft 3504sec preferred_lft 3504sec
inet6 fe80::ccd3:f5b4:4faf:2321/64 scope link noprefixroute
valid_lft forever preferred_lft forever
[student@server1 ~]$
```

This lists all network interfaces on the system.  
In the above case we see 2 network interfaces, the loopback interface `lo` and the hot-pluggable device `ens1`. The loopback interface is used for IP communication between processes on the machine.  
  
We can see:

  * The current link state:  
    `2: ens1: mtu 1500 qdisc fq_codel state UP group default qlen 1000`
  * The MAC address configuration:  
    `link/ether 52:54:00:d4:91:88`
  * the IPv4 configuration:  
    `inet 192.168.122.237/24`
  * and the IPv6 configuration:  
    `inet6 fe80::ccd3:f5b4:4faf:2321/64`

Every interface automatically gets an IPv6 address which can only be used for communication on the local network. Such addresses start with `fe80`.

If you are interested in the link status only of the network interfaces, you can use the `ip link show` command. You can reveal statistics on received packets (RX) and transmitted packets (TX) by adding the `-s` option: `ip -s link show`



### Validating Routing

Routing is required for every network that needs to communicate to devices on other networks. For that to work, the network but have at least one default router or gateway. The default gateway must always be on the same network or subnet. You can check which gateway is being used with the `ip route show` command:

```
[student@server1 ~]$ ip route show
default via 192.168.122.1 dev ens1 proto dhcp metric 100
192.168.122.0/24 dev ens1 proto kernel scope link src 192.168.122.237 metric 100
```

The most important part is the first line that shows the default route goes through `192.168.122.1` and also shows that device `ens1` must be used to access that gateway. We can also see that this route was assigned by `dhcp`.  
In case of multiple routes, the route with the lowest metric will be used. 



### Validating Port and Service Availability

Network issues can be related to the local IP address or router settings but can also come from network ports that are not available on the server.  
We use the `ss` command to verify the availability of ports. By using `ss -lt` we can see the listing TCP ports on the local system and by using `ss -lu` we see the UDP ports. We can combine the commands to `ss -tul`: 

{{< image src="/img/ss_netstat-1.png" alt="ss as an alternative to netstat" position="center" >}}


Notice that some ports/services are only listening on the loopback address while others are listening on `0.0.0.0` (all IPv4 addresses) or on `[::]` (all IPv6 addresses). 

