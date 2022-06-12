---
title: "Managing Systemd Targets and Working with GRUB2"
date: 2020-09-11
url: /managing-systemd-targets-working-with-grub2
toc: false
draft: false
images:
tags:
  - RHEL
  - Boot
  - Systemd Targets
  - GRUB2
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


## Managing Systemd Targets

A Systemd target is a group of units belonging together, some of these targets can be used to define the state a system should boot in. These targets can be isolated and have the `AllowIsolate` property in their `[Unit]` section.  
Four targets can be used to boot into:
* **emergency.target** : A minimal number of units are started.
* **rescue.target** : A fully operation Linux system without nonessential services.
* **multi-user.target** : The default target commonly used on servers, starts everything needed for full system functionality.
* **graphical.target** : Starts all units needed for full system functionality as well as a graphical interface.



A target configuration consists of two parts, the target unit file and the "wants" directory that contains references to all unit files that need to be loaded when entering that specific target. They can also have other targets as dependencies, specified in the target unit file.

```
[root@server1 ~]# systemctl cat multi-user.target 
# /usr/lib/systemd/system/multi-user.target
#  SPDX-License-Identifier: LGPL-2.1+
#
#  This file is part of systemd.
#
#  systemd is free software; you can redistribute it and/or modify it
#  under the terms of the GNU Lesser General Public License as published by
#  the Free Software Foundation; either version 2.1 of the License, or
#  (at your option) any later version.

[Unit]
Description=Multi-User System
Documentation=man:systemd.special(7)
Requires=basic.target
Conflicts=rescue.service rescue.target
After=basic.target rescue.service rescue.target
AllowIsolate=yes
```

The target unit doesn't contain much, it defines what it requires and which services and targets it can't coexist with. The `After` statement in the `[Unit]` sections also defines load ordering. It does not contain any information about units that it "wants".


### Understanding Wants
Wants define which units should start when booting or starting a specific target.
Wants are created when enabling units using `systemd enable`, this happens by creating a symbolic link in the `/etc/systemd/system` directory. This directory contains a subdirectory for every target, which in turn contains "wants" as symbolic links to specific services that should be started:

```
[root@server1 ~]# ls -l /etc/systemd/system/multi-user.target.wants/
total 0
lrwxrwxrwx. 1 root root 35 Sep 26 17:46 atd.service -> /usr/lib/systemd/system/atd.service
lrwxrwxrwx. 1 root root 38 Sep 26 17:44 auditd.service -> /usr/lib/systemd/system/auditd.service
lrwxrwxrwx. 1 root root 44 Sep 26 17:46 avahi-daemon.service -> /usr/lib/systemd/system/avahi-daemon.service
lrwxrwxrwx. 1 root root 39 Sep 26 17:45 chronyd.service -> /usr/lib/systemd/system/chronyd.service
lrwxrwxrwx. 1 root root 37 Sep 26 17:44 crond.service -> /usr/lib/systemd/system/crond.service
...
```

The `[Install]` section in a service unit file specifies the target it is "wanted" by. Enabling the service creates a symbolic link in that targets' "wants" directory, making sure it starts when that target is booted into or started.
```
[root@server1 ~]# systemctl cat httpd.service 
...
[Install]
WantedBy=multi-user.target

[root@server1 ~]# systemctl enable httpd
Created symlink /etc/systemd/system/multi-user.target.wants/httpd.service → /usr/lib/systemd/system/httpd.service.
```

### Isolating Targets

To get a list of all targets that are currently loaded, we can use the `systemctl --type=target` command. This shows all currently active targets. The `systemctl --type=target --all` command also shows inactivate targets.

```
[root@server1 ~]# systemctl --type=target
UNIT                   LOAD   ACTIVE SUB    DESCRIPTION                
basic.target           loaded active active Basic System               
cryptsetup.target      loaded active active Local Encrypted Volumes    
getty.target           loaded active active Login Prompts              
graphical.target       loaded active active Graphical Interface        
local-fs-pre.target    loaded active active Local File Systems (Pre)   
local-fs.target        loaded active active Local File Systems         
multi-user.target      loaded active active Multi-User System          
network-online.target  loaded active active Network is Online          
network.target         loaded active active Network                    
nfs-client.target      loaded active active NFS client services        
nss-user-lookup.target loaded active active User and Group Name Lookups
paths.target           loaded active active Paths                      
remote-fs-pre.target   loaded active active Remote File Systems (Pre)  
remote-fs.target       loaded active active Remote File Systems        
rpc_pipefs.target      loaded active active rpc_pipefs.target          
rpcbind.target         loaded active active RPC Port Mapper            
slices.target          loaded active active Slices                     
sockets.target         loaded active active Sockets                    
sound.target           loaded active active Sound Card                 
sshd-keygen.target     loaded active active sshd-keygen.target         
swap.target            loaded active active Swap                       
sysinit.target         loaded active active System Initialization      
timers.target          loaded active active Timers                     

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state, i.e. generalization of SUB.
SUB    = The low-level unit activation state, values depend on unit type.

23 loaded units listed. Pass --all to see loaded but inactive units, too.
To show all installed unit files use 'systemctl list-unit-files'.
```

Some of these targets can be isolated, they can be started to define the state of the machine and these are also the targets that can be set as the default target. They roughly correspond to the following System V runlevels:

{{<table "table table-dark table-striped table-bordered">}}
Target | Runlevel
-----|----
poweroff.target | runlevel 0
rescue.target | runlevel 1
multi-user.target | runlevel 3
graphical.target | runlevel 5
reboot.target | runlevel 6
{{</table>}}

As mentioned earlier, targets that can be isolated have the `AllowIsolate` property in their `[Unit]` section:
```
[root@server1 system]# grep Isolate *.target
anaconda.target:AllowIsolate=yes
ctrl-alt-del.target:AllowIsolate=yes
default.target:AllowIsolate=yes
emergency.target:AllowIsolate=yes
exit.target:AllowIsolate=yes
graphical.target:AllowIsolate=yes
halt.target:AllowIsolate=yes
initrd-switch-root.target:AllowIsolate=yes
initrd.target:AllowIsolate=yes
kexec.target:AllowIsolate=yes
multi-user.target:AllowIsolate=yes
poweroff.target:AllowIsolate=yes
reboot.target:AllowIsolate=yes
rescue.target:AllowIsolate=yes
runlevel0.target:AllowIsolate=yes
runlevel1.target:AllowIsolate=yes
runlevel2.target:AllowIsolate=yes
runlevel3.target:AllowIsolate=yes
runlevel4.target:AllowIsolate=yes
runlevel5.target:AllowIsolate=yes
runlevel6.target:AllowIsolate=yes
system-update.target:AllowIsolate=yes
```
To switch the current state of your machine to either one of these targets, use the `systemctl isolate` command:
`systemctl isolate rescue.target`
`systemctl isolate reboot.target`

We can set a default ttarget using the `systemctl set-default` command, or check the current default target using the `systemctl get-default` command. Notice how the existing symlink is removed and a new one is created for `default.target`:
```
[root@server1 system]# systemctl get-default 
graphical.target
 
[root@server1 system]# systemctl set-default multi-user.target 
Removed /etc/systemd/system/default.target.
Created symlink /etc/systemd/system/default.target → /usr/lib/systemd/system/multi-user.target.
```

## Working with GRUB2

The GRUB2 bootloader makes sure we can boot Linux, it's installed in the boot sector of the hard drive and loads a Linux kernel and initramfs.
The initramfs contains a mini file system, mounted during boot, from where kernel modules load that are needed during the rest of the boot process, e.g. LVM modules.

We apply changes to GRUB2 by editing the `/etc/default/grub` file and we pass boot arguments to the kernel by editing the `GRUB_CMDLINE_LINUX` line:

```
[root@server1 system]# cat /etc/default/grub 
GRUB_TIMEOUT=5
GRUB_DISTRIBUTOR="$(sed 's, release .*$,,g' /etc/system-release)"
GRUB_DEFAULT=saved
GRUB_DISABLE_SUBMENU=true
GRUB_TERMINAL_OUTPUT="console"
GRUB_CMDLINE_LINUX="crashkernel=auto resume=/dev/mapper/cl-swap rd.lvm.lv=cl/root rd.lvm.lv=cl/swap rhgb quiet"
GRUB_DISABLE_RECOVERY="true"
GRUB_ENABLE_BLSCFG=true
```

The `GRUB_TIMEOUT` parameter defines how long GRUB2 waits before proceeding with the boot procedure. During this time you can press `e` to make changes to the configuration, just as you would by editing the `/etc/default/grub` file. 

Removing the `rhgb` and `quiet` boot options would allow you to see the output of the boot procedure on screen.

After making changes to `/etc/default/grub` the relevant GRUB file on the `/boot` partition needs to be regenerated. On a BIOS system this file is located in `/boot/grub2/grub.cfg`, while on a UEFI system the file is located in `/boot/efi/EFI/redhat/grub.cfg`. To regenerate these files, we issue the `grub2-mkconfig` command and redirect its output to either one of these files:
`grub2-mkconfig -o /boot/grub2/grub.cfg`
`grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg`

