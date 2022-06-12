---
title: "Basic Kernel Management"
date: 2020-09-01
url: /basic-kernel-management
toc: false
draft: false
images:
tags:
  - RHEL
  - kernel management
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


## The Role of the Linux Kernel

The Linux kernel is the layer between the user who works with Linux from a shell environment and the available hardware. It manages the I/O instructions received from software and translates it to CPU instructions. The kernel also handles essential operating system tasks like the scheduler to make sure that any processes started on the OS are handled by the CPU.

OS tasks that are handled by the kernel are implemented by using different kernel threads. You can easily indentify them with a command like *ps aux*, the kernel threads are listed between square brackets:

```
[root@server1 ~]# ps aux
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.5 180072 10364 ?        Ss   09:50   0:01 /usr/lib/syst
root           2  0.0  0.0      0     0 ?        S    09:50   0:00 [kthreadd]
root           3  0.0  0.0      0     0 ?        I<   09:50   0:00 [rcu_gp]
root           4  0.0  0.0      0     0 ?        I<   09:50   0:00 [rcu_par_gp]
root           6  0.0  0.0      0     0 ?        I<   09:50   0:00 [kworker/0:0H
root           8  0.0  0.0      0     0 ?        I<   09:50   0:00 [mm_percpu_wq
root           9  0.0  0.0      0     0 ?        S    09:50   0:00 [ksoftirqd/0]
root          10  0.0  0.0      0     0 ?        I    09:50   0:00 [rcu_sched]
```

The kernel also handles hardware initialization, making sure hardware can be used. To do so, drivers must be loaded and since the kernel is modular these drivers are loaded as kernel modules.

Hardware manufacturers do not always provide open source drivers, in this case the alternative would be to use closed source drivers. This is not always ideal, a badly functioning driver can crash the entire kernel. If this happens on an open source driver, the Linux community would jump in to debug and fix the problem which cannot be done on a closed source driver. A closed source or proprietary driver may however provide additional functionality not available in the open source equivalent. A kernel that is using closed source drivers is known as a *tainted kernel*.


## Analyzing What the Kernel is Doing

A few different tools are provided by the Linux operating system to help check what the kernel is doing:
* **dmesg**
* The `/proc` pseudo file system
* The **uname** and **hostnamectl** utility


When you require detailed information about kernel activity, you can use the **dmesg** command. This prints the content of the kernel ring buffer, an area of memory where the kernel keeps the recent log messages. Each entry in the output starts with a time indicator that shows the specific second the event was logged, relative to the start of the kernel.

An alternative to **dmesg** is **journalctl - -dmesg** or **journalctl -k**. These commands show a clock time indicator.

```
[root@server1 ~]# dmesg | head
[    0.000000] Linux version 4.18.0-193.19.1.el8_2.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 8.3.1 20191121 (Red Hat 8.3.1-5) (GCC)) #1 SMP Mon Sep 14 14:37:00 UTC 2020
[    0.000000] Command line: BOOT_IMAGE=(hd0,msdos1)/vmlinuz-4.18.0-193.19.1.el8_2.x86_64 root=/dev/mapper/cl-root ro crashkernel=auto resume=/dev/mapper/cl-swap rd.lvm.lv=cl/root rd.lvm.lv=cl/swap rhgb quiet
[    0.000000] x86/fpu: x87 FPU will use FXSAVE
[    0.000000] BIOS-provided physical RAM map:
[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable
[    0.000000] BIOS-e820: [mem 0x000000000009fc00-0x000000000009ffff] reserved
[    0.000000] BIOS-e820: [mem 0x00000000000f0000-0x00000000000fffff] reserved
[    0.000000] BIOS-e820: [mem 0x0000000000100000-0x000000007ffdcfff] usable
[    0.000000] BIOS-e820: [mem 0x000000007ffdd000-0x000000007fffffff] reserved
[    0.000000] BIOS-e820: [mem 0x00000000b0000000-0x00000000bfffffff] reserved


[root@server1 ~]# journalctl -k | head
-- Logs begin at Fri 2020-10-02 09:50:11 +04, end at Fri 2020-10-02 10:53:20 +04. --
Oct 02 09:50:11 server1.example.local kernel: Linux version 4.18.0-193.19.1.el8_2.x86_64 (mockbuild@kbuilder.bsys.centos.org) (gcc version 8.3.1 20191121 (Red Hat 8.3.1-5) (GCC)) #1 SMP Mon Sep 14 14:37:00 UTC 2020
Oct 02 09:50:11 server1.example.local kernel: Command line: BOOT_IMAGE=(hd0,msdos1)/vmlinuz-4.18.0-193.19.1.el8_2.x86_64 root=/dev/mapper/cl-root ro crashkernel=auto resume=/dev/mapper/cl-swap rd.lvm.lv=cl/root rd.lvm.lv=cl/swap rhgb quiet
Oct 02 09:50:11 server1.example.local kernel: x86/fpu: x87 FPU will use FXSAVE
Oct 02 09:50:11 server1.example.local kernel: BIOS-provided physical RAM map:
Oct 02 09:50:11 server1.example.local kernel: BIOS-e820: [mem 0x0000000000000000-0x000000000009fbff] usable
Oct 02 09:50:11 server1.example.local kernel: BIOS-e820: [mem 0x000000000009fc00-0x000000000009ffff] reserved
Oct 02 09:50:11 server1.example.local kernel: BIOS-e820: [mem 0x00000000000f0000-0x00000000000fffff] reserved
Oct 02 09:50:11 server1.example.local kernel: BIOS-e820: [mem 0x0000000000100000-0x000000007ffdcfff] usable
Oct 02 09:50:11 server1.example.local kernel: BIOS-e820: [mem 0x000000007ffdd000-0x000000007fffffff] reserved
```
  

Many of the performance related commands or tools we use grab their information from the `/proc` file system. It contains detailed status information about what is happening on the machine. The `/proc` directory contains Process ID subdirectories which contain information about the particular process. The directory also contains status files, i.e. `/proc/partitions` or `/proc/meminfo`:


```
[root@server1 ~]# cat /proc/1146/status
Name:	kvdo0:cpuQ0
Umask:	0000
State:	S (sleeping)
Tgid:	1146
Ngid:	0
Pid:	1146
PPid:	2
...

[root@server1 ~]# cat /proc/partitions 
major minor  #blocks  name

  11        0    8038400 sr0
   8       64    5242880 sde
   8       48    5242880 sdd
   8        0   26214400 sda
   8        1    1048576 sda1
   8        2   25164800 sda2
   8       32    5242880 sdc
   8       16    5242880 sdb
   8       17     102400 sdb1
   8       18     921600 sdb2
   8       19    2097152 sdb3
   8       20    2120687 sdb4
...



[root@server1 ~]# cat /proc/meminfo 
MemTotal:        1870616 kB
MemFree:           87464 kB
MemAvailable:     184724 kB
...
```
   
We can change kernel performance parameters during run time by writing values to the `/proc/sys` pseudo file system. You can apply the changes permanently by writing the parameters to `/etc/sysctl.conf`. To see what parameters are currently in use, issue the **systctl -a** command.

```
[root@server1 ~]# sysctl -a | grep ip_forward
net.ipv4.ip_forward = 0

[root@server1 ~]# echo "1" > /proc/sys/net/ipv4/ip_forward
[root@server1 ~]# sysctl -a | grep ip_forward
net.ipv4.ip_forward = 1


[root@server1 ~]# echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
[root@server1 ~]# reboot


[root@server1 ~]# sysctl -a | grep ip_forward
net.ipv4.ip_forward = 1
```


Another useful command would be **uname** and **hostnamectl**, it gives different kinds of information about the OS:

```
[root@server1 ~]# uname -a
Linux server1.example.local 4.18.0-193.19.1.el8_2.x86_64 #1 SMP Mon Sep 14 14:37:00 UTC 2020 x86_64 x86_64 x86_64 GNU/Linux

[root@server1 ~]# uname -r
4.18.0-193.19.1.el8_2.x86_64

[root@server1 ~]# hostnamectl status
   Static hostname: server1.example.local
         Icon name: computer-vm
           Chassis: vm
        Machine ID: e40db12b26ec4e9bb6a6f295f6d4d83e
           Boot ID: 5441210211394c5098724e9b89426cb2
    Virtualization: kvm
  Operating System: CentOS Linux 8 (Core)
       CPE OS Name: cpe:/o:centos:centos:8
            Kernel: Linux 4.18.0-193.19.1.el8_2.x86_64
      Architecture: x86-64
```

Lastly, you can *cat* the distribution release verion:
```
[root@server1 ~]# cat /etc/redhat-release 
CentOS Linux release 8.2.2004 (Core) 
```


## Working with Kernel Modules
Since the release of Linux kernel 2.0 kernels are no longer compiled but modular. A modular kernel consists of a relatively small kernel core and provides driver support through modules that are loaded when they are required. Modules implement specific kernel functionality, they are not limited to loading hardware drivers alone. For example, file system support is also loaded as kernel modules.


### Understanding Hardware Initialization

The loading of drivers is an automated process:
* The kernel probes available hardware during boot.
* When a hardware component is detected, the **systemd-udevd** process loads the appropriate driver and makes the device available.
* **systemd-udevd** reads the rules in `/usr/lib/udev/rules.d/`. These are system-provided rules that should not be modified.
* **systemd-udevd** reads custom rules from the `/etc/udev/rules.d` directory, if available.
* Required kernel modules have been loaded and the status of associated hardware is written to the sysfs file system on `/sys`. This pseudo file system tracks hardware-related settings.

The **systemd-udevd** process continuously monitors for plugging and unplugging of hardware devices. You can see this in action when plugging/unplugging an usb or other block device while the **udevadm monitor** command is running:

```
[root@server1 ~]# udevadm monitor
monitor will print the received events for:
UDEV - the event which udev sends out after rule processing
KERNEL - the kernel uevent

KERNEL[7080.543250] change   /devices/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0/block/sr0 (block)
UDEV  [7080.558849] change   /devices/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0/block/sr0 (block)
KERNEL[7080.578292] change   /devices/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0/block/sr0 (block)
UDEV  [7080.746283] change   /devices/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0/block/sr0 (block)
```

### Managing Kernel Modules

Although loading of drivers happens automatically when they are required, there might be occasions where you need to manually load the appropriate kernel module.

To list all currently used kernel modules we use the **lsmod** command:
```
[root@server1 ~]# lsmod | head
Module                  Size  Used by
binfmt_misc            20480  1
nls_utf8               16384  1
isofs                  45056  1
fuse                  131072  3
uinput                 20480  1
xt_CHECKSUM            16384  1
ipt_MASQUERADE         16384  3
xt_conntrack           16384  1
ipt_REJECT             16384  2
```

**modinfo** provides more information about a specific kernel module, including two interesting sections: the alias and parms.
The alias refers to an alternative name that can be used to address the module and, the parms section refer to parameters that can be set while loading the module.

```
[root@server1 ~]# modinfo e1000
filename:       /lib/modules/4.18.0-193.19.1.el8_2.x86_64/kernel/drivers/net/ethernet/intel/e1000/e1000.ko.xz
version:        7.3.21-k8-NAPI
license:        GPL
description:    Intel(R) PRO/1000 Network Driver
author:         Intel Corporation, <linux.nics@intel.com>
rhelversion:    8.2
srcversion:     9DFB28D9833DABBB7757EDD
alias:          pci:v00008086d00002E6Esv*sd*bc*sc*i*
...
depends:        
intree:         Y
name:           e1000
vermagic:       4.18.0-193.19.1.el8_2.x86_64 SMP mod_unload modversions 
sig_id:         PKCS#7
signer:         CentOS Linux kernel signing key
sig_key:        4C:02:86:8D:9E:A5:E0:4D:A9:C5:DF:8B:D7:28:EA:05:AF:C6:2A:6D
sig_hashalgo:   sha256
signature:      65:B3:87:34:C5:6F:E5:26:A7:41:90:2C:BB:20:04:54:6E:93:44:2A:
		86:73:D7:FF:FD:12:D3:17:74:EB:4B:9B:9C:FB:19:3F:D8:6A:16:10:
		0D:72:69:CA:63:B2:2E:63:A9:B4:84:94:0D:4B:C4:94:FC:E6:48:CC:
		95:DB:99:65:BC:6F:57:1C:F2:C5:CF:F0:BE:F2:8B:63:11:8F:43:C1:
		8C:1C:D3:03:6B:BC:76:0E:18:06:76:F1:C1:CF:72:84:04:92:07:A7:
		C4:59:4B:7B:72:86:CD:EB:A8:C5:EF:D9:39:FD:B0:38:1A:E3:49:18:
		04:88:39:8D:B9:98:D3:5E:EA:0C:CA:B7:44:51:64:F8:7F:CA:01:75:
		9A:48:DD:E9:2E:E1:38:60:C6:33:37:1A:81:79:B1:22:63:16:5B:42:
		DF:E2:08:9B:B4:47:47:9E:9A:69:5D:62:E9:9E:72:A3:7D:D0:E0:B0:
		51:24:EA:AD:B1:0B:08:67:63:89:17:19:9A:DF:13:82:FB:C2:DA:32:
		97:AA:07:C4:75:A5:6A:A1:E4:AF:D3:64:04:45:24:3F:40:81:21:12:
		99:11:54:2C:04:0C:86:98:56:79:C9:34:EC:B9:96:4F:52:BE:A4:CC:
		0A:3D:0F:78:5B:0E:1A:E3:7A:57:45:FA:B3:80:EF:B0:2E:75:8F:8B:
		FE:71:A1:74:63:DC:B2:7E:29:AD:87:4B:6E:AF:66:F7:81:34:1E:0B:
		7D:02:71:93:20:01:A7:9B:08:5F:AD:8C:EA:F5:E4:1E:4A:D1:AF:90:
		CE:23:9A:65:5B:F7:DE:94:3C:DF:6F:5C:15:51:62:D1:64:05:B3:8A:
		9A:F4:83:3C:C4:31:E4:EE:A5:6C:0D:56:96:DC:F1:00:53:91:78:BD:
		D4:20:03:A1:59:07:58:16:B0:8D:7B:19:E6:6A:A3:31:81:7E:31:ED:
		77:66:58:B0:F5:68:4E:A0:FA:5C:8B:56:40:4A:BB:77:E3:E3:13:62:
		1B:E5:5C:13
parm:           TxDescriptors:Number of transmit descriptors (array of int)
parm:           RxDescriptors:Number of receive descriptors (array of int)
parm:           Speed:Speed setting (array of int)
parm:           Duplex:Duplex setting (array of int)
parm:           AutoNeg:Advertised auto-negotiation setting (array of int)
parm:           FlowControl:Flow Control setting (array of int)
parm:           XsumRX:Disable or enable Receive Checksum offload (array of int)
parm:           TxIntDelay:Transmit Interrupt Delay (array of int)
parm:           TxAbsIntDelay:Transmit Absolute Interrupt Delay (array of int)
parm:           RxIntDelay:Receive Interrupt Delay (array of int)
parm:           RxAbsIntDelay:Receive Absolute Interrupt Delay (array of int)
parm:           InterruptThrottleRate:Interrupt Throttling Rate (array of int)
parm:           SmartPowerDownEnable:Enable PHY smart power down (array of int)
parm:           copybreak:Maximum size of packet that is copied to a new buffer on receive (uint)
parm:           debug:Debug level (0=none,...,16=all) (int)
```

To manually load and unload modules we use the **modprobe** and **modprobe -r** commands.
The **modprobe** command automatically loads any dependencies. 


### Checking Driver Availability for Hardware Devices
To check if a particular device is supported and thus has a module loaded you can use the **lspci -k** command. 
If there are any devices for which no kernel module was loaded you're likely dealing with an unsupported device.

```
[root@server1 ~]# lspci -k
00:00.0 Host bridge: Intel Corporation 82G33/G31/P35/P31 Express DRAM Controller
	Subsystem: Red Hat, Inc. QEMU Virtual Machine
00:01.0 VGA compatible controller: Red Hat, Inc. Virtio GPU (rev 01)
	Subsystem: Red Hat, Inc. Device 1100
	Kernel driver in use: virtio-pci
...
```


### Managing Kernel Module Parameters
You may want to load kernel modules with specific parameters you've discovered using the **modinfo** command. To do so, specify the name of the parameter and its value in the **modprobe** command:
```
[root@server1 ~]# modprobe cdrom debug=1
[root@server1 ~]# 
```

To make this persistent, you can add an entry to `/etc/modprobe.conf` or create a file in the `/etc/modprobe.d/` directory where the name of the file matches the module name and the content specifies the parameters you want to set:

```
[root@server1 modprobe.d]# pwd
/etc/modprobe.d
[root@server1 modprobe.d]# cat cdrom.conf 
options cdrom debug=1
```


## Upgrading the Linux Kernel
When upgrading the Linux kernel a new version of the kernel is installed next to the current version and will be used by default.
The kernel files for the last four kernels installed will be kept in `/boot`. The GRUB2 boot loader automatically picks up all kernels found in this directory, allowing you to select an older kernel at boot time in case the newly installed kernel doesn't boot correctly.

To install a new version of the kernel, issue the **yum upgrade kernel** or **yum install kernel** command.