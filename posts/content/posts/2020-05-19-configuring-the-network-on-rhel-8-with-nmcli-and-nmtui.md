---
title: Configuring the Network on RHEL 8 with nmcli and nmtui
author: Joeri
date: 2020-05-19T08:03:28+00:00
url: /configuring-the-network-on-rhel-8-with-nmcli-and-nmtui/
swp_cache_timestamp:
  - 442547
categories:
  - CentOS
  - Red Hat Enterprise Linux
tags:
  - centos8
  - network configuration
  - nmcli
  - nmtui
  - RHEL
  - RHCSA

---
{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


In the previous post we learned how the check the runtime configuration of the network using the `ip` command. To make persistent changes to the network configuration that will survive a reboot, we need to use either `nmcli` or `nmtui`.

Networking is managed by the _NetworkManager_ service. When the _NetworkManager_ service comes up, it reads the network card configuration scripts that are located in `/etc/sysconfig/network-scripts` and that have a name which starts with `ifcgf` followed by the name of the network card.  
  
You can check the status of the NetworkManager using `systemctl status NetworkManager`.

On RHEL 8, we differentiate between a device and a connection as follows:

  * A device is a network interface card
  * A connection is the configuration that is applied to the device 

You can create multiple connections for one device and manage the connections we assign to devices using `nmcli` or `nmtui`.


## Required Permissions

The root user can make modifications to the network configuration and so can regular users _if they are logged in to the local console_: if a regular user is using the system keyboard to enter either a graphical or text-based console, some permissions to change the network configuration are granted. This is because users are supposed to be able to connect their local system to a network.

Users that have used `ssh` to connect to a server are _not_ allowed to change the network configuration.  
  
You can check the current permissions using the `nmcli gen permissions` command:


{{< image src="/img/nmcli_gen_permissions.png" alt="nmcli permissions" position="center" >}}


## Configuring the Network with nmcli

We can use the `nmcli` command to make persistent changes to our network configuration. `nmcli` will write your configuration to the network card configuration scripts located in `/etc/sysconfig/network-scripts` from where it will be read by the _NetworkManager_ service during boot time or when restarting the service.

Active and inactive connections can be shown using the `nmcli con show` command. Inactive connections are not assigned to a device:

{{< image src="/img/nmcli_con_show-1.png" alt="nmcli permissions" position="center" >}}


Once you have an overview of the connections, you can see the details of a connection using `nmcli con show _connectionname_`, e.g. `nmcli con show ens1`. This will show all properties of the given connection. Check `man nm-settings` to find out what these settings do exactly.

Just as with connections, we can see the currently configured devices and their status: `nmcli dev status`


{{< image src="/img/nmcli_dev_status.png" alt="nmcli dev status" position="center" >}}


We use `nmcli dev show devicename` to reveal the settings for a specific device:
{{< image src="/img/nmcli_dev_show.png" alt="nmcli dev status" position="center" >}}



### Creating Network Connections

We can use the `nmcli con add` command to create a new connection on a specific device. Bash completion and the `nmcli-examples` man page can help you on this. I'll list two examples below, one dhcp configured connection and one static configuration.

```
[student@server1 ~]$ nmcli con add con-name dhcp-config type ethernet ifname ens1 ipv4.method auto
[student@server1 ~]$ nmcli con add con-name static-config type ethernet ifname ens1 autoconnect no ip4 10.0.0.10/24 gw4 10.0.0.1 ipv4.method manual

```

### Modifying Connection Parameters

`nmcli con mod` allows us to modify the connections we added earlier.  
Let's make sure our static connection automatically connects:

```
[student@server1 ~]$ nmcli con mod static-config autoconnect yes
```

We'll also add a DNS server, notice how i'm using `ipv4` and not `ip4` like when adding a connection:

```
[student@server1 ~]$ nmcli con mod static-config ipv4.dns 10.0.0.10
```
We can add a secondary DNS server using the _+_ sign:

```
[student@server1 ~]$ nmcli con mod static-config +ipv4.dns 8.8.8.8
```
Let's also change the current IP address and add a second IP address:

```
[student@server1 ~]$ nmcli con mod static-config ipv4.addresses 10.0.0.100/24
[student@server1 ~]$ nmcli con mod static-config +ipv4.addresses 10.20.30.40/16
```
When we are done with our modifications, we should activate our changes:

```
[student@server1 ~]$ nmcli con up static-config
Connection successfully activated (D-Bus active path: /org/freedesktop/NetworkManager/ActiveConnection/5)
[student@server1 ~]$
```

## Configuring the Network with nmtui

`nmtui` is a textual user interface for the fairly complicated syntax of the `nmcli` command. Everything that can be done with `nmcli` can also be done with `nmtui` so I won't cover it too much as it's pretty much self-explanatory. 

{{< image src="/img/nmtui-1.png" alt="nmtui" position="center" >}}

{{< image src="/img/nmtui-2.png" alt="nmtui" position="center" style="margin-top: 10px; margin-bottom: 10px;">}}

{{< image src="/img/nmtui-3.png" alt="nmtui" position="center" >}}


## Working with Network Configuration Files

If you don't like making configuration changes using `nmcli` or `nmtui` you can directly edit the network interface card configuration file itself. After making changes to the configuration file, use the `nmcli con up` command to activate the new configuration.

{{< image src="/img/ifcg-ens1.png" alt="interface card configuration file" position="center" >}}


>You can set both a fixed IP address and a dynamic IP address in one network configuration. Set the BOOTPROTO option to in the configuration file to dhcp while also specifying an IP address and network prefix.  You can also do this from `nmtui` by making sure the IPv4 configuration is set to Automatic while also specifying an IP address.

{{< image src="/img/nmtui-staticdhcp.png" alt="Static DHCP with nmtui" position="center" >}}


## Hostname and Name Resolution

Hostnames are used to communicate with other hosts. A hostname consists of the name of the host and the DNS domain in which they reside, these two parts together make up for the fully qualified domain name (FQDN), e.g. server1.example.com. An FQDN would provide a unique identity on the internet.

### Hostnames

We can use different ways to set the hostname:

  * Use `nmtui` and select the `Change Hostname` option
  * Use `hostnamectl set-hostname`
  * Edit the `/etc/hostname` configuration file

After setting the hostname, you can use `hostnamectl status` to show the current hostname:

```
[root@server1 ~]# hostnamectl set-hostname server1.example.local
[root@server1 ~]# hostnamectl status
Static hostname: server1.example.local
```

We can configure hostname resolution in the `/etc/hosts` file.  
The first column has the IP address of the host, the second specifies the hostname (either short or FQDN). If it has more than one name (short and FQDN) the second column must be the FQDN and the third one the alias or shortname:

```
bash[root@server1 ~]# cat /etc/hosts
127.0.0.1 localhost localhost.localdomain localhost4 localhost4.localdomain4
::1 localhost localhost.localdomain localhost6 localhost6.localdomain6
10.0.0.2 server2.example.local server2
```

Definitions in the `/etc/hosts` file will be applied before the hostname in DNS resolution is used. This priority is set in `/etc/nsswitch.conf` where `files` is a reference to the `/etc/hosts` file.

```
hosts: files dns myhostname
```

### DNS Name Resolution

In order to communicate with other hosts on the Internet we will need DNS.  
We already know how to set a DNS server using `nmcli` or `nmtui`.  
The _NetworkManager_ reads the configuration script in `/etc/sysconfig/network-scripts` and pushes the DNS configuration to `/etc/resolv.conf`.  
If you edit the `/etc/resolv.conf` file manually, your changes will be overwritten by _NetworkManager_ the next time it starts.

It's recommended to setup at least two DNS Name Servers for redundancy:

  * Use `nmtui`
  * Set the DNS1 and DNS2 parameters in the `ifcfg` network configuration file
  * Use DHCP
  * Use `nmcli con mod <connection name> [+]ipv4.dns <ip-of-dns>`

If the connection is configured to get the configuration from a DHCP server then the DNS server is also set via DHCP. If you don't want that to happen you have two options:

  * Edit the `ifcfg` configuration file to include the option `PEERDNS=no`
  * Use `nmcli cod mod <connection name> ipv4.ignore-auto-dns yes`

To verify hostname resolution use the `getent hosts <hostname>` command. This searches in both `/etc/hosts` and DNS to resolve the specified hostname.