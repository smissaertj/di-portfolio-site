---
title: "Configuring and Managing Time Services"
date: 2021-02-10
url: /configuring-and-managing-time-services
toc: false
draft: false
images:
tags:
  - RHEL
  - Network
  - NTP
  - System Time
  - Hardware Clock
  - Time Services
  - Network Time
---

{{< figure class="center" src="/img/redhat-8-logo.png" alt="Red Hat logo">}}


# Understanding Local Time
When a Linux machine boots, the hardware clock, also referred to as the real-time clock, is read. This clock resides in the computer hardware, it's in an integrated circuit on the system board that is independent of the current state of the operating system. It keeps running when the computer is shutdown, as long as the system board battery or power supply feeds it. The hardware clock value is known as hardware time, the system gets its initial time setting from hardware time. The hardware clock is usually set to Coordinated Universal Time (UTC).

System time is maintained by the operating system, it's independent of the hardware clock. When the system time is changed, the new system time is not automatically synchronized with the hardware clock.  

System time is kept in UTC, applications runing on the operating system convert system time into local time. Local time is the actual time in the current time zone, daylight saving time (DST) is considered so that the system always shows an accurate time.


{{<table "table table-dark table-striped table-bordered">}}
Concept | Explanation
-------|------
Hardware clock | The clock that resides on the main board of a computer system.
Real-time clock | Same as hardware clock.
System time | The time that is maintained by the operating system.
Software clock | Similar to system time.
UTC | Coordinated Universal Time, a worldwide standard time.
Daylight saving time | Calculation that is made to change time automatically when DST changes occur.
local time | The time that corresponds to the time in the current time zone.
{{</table>}}


# Using Network Time Protocol
Since the hardware clock is typically part of the computer's motherboard, it can be potentially unreliable. It's a good idea to use time from a more reliable source. Generally speaking, two solutions are available.  

One option is to buy a more reliable hardware clock. Using an external hardware clock is a common solution in datacenter environments to guarantee reliable time is maintained even if external networks for time synchronization are temporarily not available. An example would be a very accurate [atomic clock](https://www.wired.co.uk/article/google-gps-powered-database). 

A more common solution is to configure your machine to use Network Time Protocol (NTP), a method of maintaining system time provided through NTP servers on the Internet. To determine which Internet NTP server should be used, the concept of *stratum* is introduced. Stratum defines the reliability of an NTP time source, and the lower the stratum value, the more reliable it is. Typically, Internet time servers are using stratum 1 or 2. When you configure a local time server, you can use a higher stratum value. As a consequence, machines configured to use the local time server will only ever use it if Internet time servers (with a lower stratum) are not available. 

Setting up a machine to use NTP on RHEL 8 is easy if the server is already connected to the internet. In this case the `/etc/chrony.conf` file is prepopulated with a standard list of NTP servers. You would only need to turn on NTP using the `timedatectl set-ntp true` command (more on this later). 


# Managing Time on Red Hat Enterprise Linux
On a Linux system, time is calculated as an offset of *epoch* time. [Epoch time](https://en.wikipedia.org/wiki/Unix_time) is the number seconds since January 1, 1970, in UTC. You can convert an epoch time stamp to a human readable form using the `date --date` command, followd by the epoch string starting with an @:
```
[student@server1 ~]$ date --date @1420987251
Sun Jan 11 06:40:51 PM +04 2015
```

## Using date
The `date` command enables you to manage the system time. Or you can use it to show the current time in different formats:
* `date` - Shows the current system time.
* `date +%d-%m-%y` - Shows the current system day, month and year.
* `date -s 16:03` - Sets the current system time to 3 minutes pas 4pm.


## Using hwclock
The `date` command will not change the hardware time. To manage hardware time you can use the `hwclock` command, which has many options (See `hwclock --help`).
Some options of interest:
* `hwclock --systohc` - Sync the current system time to the hardware clock.
* `hwclock --hctosys` - Sync the current hardware time to the system clock.


## Using timedatectl
The `timedatectl` command shows detailed information about the current time and date. It also displays the time zone, in addition to information about the use of NTP network time and DST.


The `timedatectl` command works with the below subcommands to perform time operations:
{{<table "table table-dark table-striped table-bordered">}}
Command | Explanation
-------|------
status | Shows the current time settings.
set-time TIME | Sets the current time.
set-timezone TIMEZONE | Sets the time zone.
list-timezone | Shows a list of all time zones.
set-local-rtc [0|1] | Controls whether the real-time clock (hardware clock) is in local time.
set-ntp [0|1] | Enables or disables NTP.
{{</table>}}

```
[root@server1 ~]# timedatectl status
               Local time: Mon 2021-03-15 21:27:17 +04
           Universal time: Mon 2021-03-15 17:27:17 UTC
                 RTC time: Mon 2021-03-15 17:27:17
                Time zone: Indian/Mauritius (+04, +0400)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no


[root@server1 ~]# timedatectl set-time 22:30
[root@server1 ~]# timedatectl
               Local time: Mon 2021-03-15 22:30:03 +04
           Universal time: Mon 2021-03-15 18:30:03 UTC
                 RTC time: Mon 2021-03-15 18:30:03
                Time zone: Indian/Mauritius (+04, +0400)
System clock synchronized: no
              NTP service: inactive
          RTC in local TZ: no

```
After enabling NTP again, you will have to wait a few minutes for the time to synchronize again:
```
[root@server1 ~]# timedatectl set-ntp 1
[root@server1 ~]# timedatectl
               Local time: Mon 2021-03-15 21:30:19 +04
               ....

[root@server1 ~]# timedatectl list-timezones | grep -i mauritius
Indian/Mauritius
[root@server1 ~]# timedatectl set-timezone Indian/Mauritius
[root@server1 ~]#
```


## Managing Time Zone Settings
Between Linux servers, time is normally communicated in UTC. This allows servers located in different time zones to use the same time settings, making it easier to manage large organizations. To make it easier for end users, we should set the local time, and for this we would need to configure an appropriate time zone. 

There are 3 approaches to setting the local time zone.
* Use `timedatectl set-timezone`
* Use the `tzselect` command to start an text based interface.
* Go the the `/usr/share/zoneinfo` directory where you'll find different subdirectories containing files for each time zone. To select a time zone, you create a symbolic link with the name `/etc/localtime` to the relevant time zone file. e.g. `ln -sf /usr/share/zoneinfo/America/Los_Angeles /etc/localtime`


## Configuring Time Service Clients
By default, the **chrony** service is configured to get the right time from the Internet. In a corporate environment it is not always desirable for clients to go out to the Internet, and instead time servers on the local network are configured.

In the below example we'll configure an NTP server on `server2` and we'll configure `server1` as the client.

On `server1` we comment out the predefined NTP server in `/etc/chrony.conf` and define the `server2` pool:
```
# Use public servers from the pool.ntp.org project.
# Please consider joining the pool (http://www.pool.ntp.org/join.html).
#pool 2.rhel.pool.ntp.org iburst
pool server2
```

On `server2` we edit `/etc/chrony.conf` to allow connections from a specific subnet, we set a stratum value, then configure the firewall and restart the `chronyd` service:
```
# Use public servers from the pool.ntp.org project.
# Please consider joining the pool (http://www.pool.ntp.org/join.html).
#pool 2.rhel.pool.ntp.org iburst

allow 192.168.0.0/16
local stratum 8
```

```
[root@server2 ~]# firewall-cmd --add-service=ntp --permanent
success
[root@server2 ~]# firewall-cmd --reload
success
[root@server2 ~]# systemctl restart chronyd
[root@server2 ~]# 
```

Restart the `chronyd` service on `server1` and check if `server2` is used as a source:
```
[root@server1 ~]# systemctl restart chronyd
[root@server1 ~]# chronyc sources
210 Number of sources = 1
MS Name/IP address         Stratum Poll Reach LastRx Last sample               
===============================================================================
^? server2                       8   6     1     6    +15us[  +15us] +/-   98us
[root@server1 ~]#
```