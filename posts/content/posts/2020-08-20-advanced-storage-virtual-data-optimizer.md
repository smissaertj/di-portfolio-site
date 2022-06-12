---
title: "Advanced Storage: Virtual Data Optimizer"
date: 2020-08-20
url: /advanced-storage-virtual-data-optimizer
toc: false
images:
tags:
  - RHEL
  - Storage
  - Advanced Storage
  - VDO
  - Virtual Data Optimizer
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}

Virtual Data Optimizer is a storage solution developed to reduce disk space usage on block devices by applying deduplication features. VDO creates volumes on top of any existing block device from where you either create an XFS file system, or use the volume as a Physical Volume in an LVM setup.

VDO uses three common technologies:
* **Zero-block elimination** to filter out data blocks that contain only zeros.
* **Deduplication** of redundant data blocks.
* **Compression** when the kvdo module compresses data blocks.


Typical usage cases for VDO are host platforms for containers and virtual machines or cloud block storage. 
Commonly, a logical size of up to 10 times the physical size is used for these types of environments. 


## Setting up VDO

To use VDO the underlying block devices must have a minimal size of 4GiB and the **vdo** and **kmod-kvdo** packages must be installed. 

We create the VDO device using the `vdo create` command, specify a name using the `--name=` option, and we _can_ specify the logical size using the `--vdoLogicalSize=` option. e.g. `vdo create --name=myvdo1 --vdoLogicalSize=1T /dev/sdb`

Once the device is created, we can put an XFS file system on top of it:
`mkfs.xfs -K /dev/mapper/myvdo1`
The `-K` option prevents unused blocks from being discarded immediately, making the command much faster.

At this point we issue the `udevadm settle` command to ensure device nodes have been created succesfully.

To persistently mount the VDO file system using the `/etc/fstab` file we must include the following mount options:
`x-systemd.requires=vdo.service,discard`
This makes sure the **vdo** service is loaded before trying to mount the file system. 

An alternative method to persistently mount the VDO file system is to use the example systemd mount unit found in `/usr/share/doc/vdo/examples/systemd`.
Copy it to `/etc/systemc/system/mountpointname.mount` and edit the following lines:

```
name = 
What = 
Where = 

```

The Unit file name must correspond to the _name_, _What_ and _Where_ values.
Make sure to enable and start the moutn at boot: `systemctl enable --now mountpointname.mount`


### Example

```
[root@server1 ~]# vdo create --name=vdo1 --device=/dev/sdb --vdoLogicalSize=1T
Creating VDO vdo1
      The VDO volume can address 2 GB in 1 data slab.
      It can grow to address at most 16 TB of physical storage in 8192 slabs.
      If a larger maximum size might be needed, use bigger slabs.
Starting VDO vdo1
Starting compression on VDO vdo1
VDO instance 0 volume is ready at /dev/mapper/vdo1


[root@server1 ~]# lsblk
NAME        MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda           8:0    0   25G  0 disk 
├─sda1        8:1    0    1G  0 part /boot
└─sda2        8:2    0   24G  0 part 
  ├─cl-root 253:0    0   22G  0 lvm  /
  └─cl-swap 253:1    0  2.1G  0 lvm  [SWAP]
sdb           8:16   0    5G  0 disk 
└─vdo1      253:2    0    1T  0 vdo  
sdc           8:32   0    5G  0 disk 

[root@server1 ~]# mkfs.xfs -K /dev/mapper/vdo1 
meta-data=/dev/mapper/vdo1       isize=512    agcount=4, agsize=67108864 blks
         =                       sectsz=4096  attr=2, projid32bit=1
         =                       crc=1        finobt=1, sparse=1, rmapbt=0
         =                       reflink=1
data     =                       bsize=4096   blocks=268435456, imaxpct=5
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=131072, version=2
         =                       sectsz=4096  sunit=1 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0

[root@server1 ~]# udevadm settle

[root@server1 ~]# cp /usr/share/doc/vdo/examples/systemd/VDO.mount.example /etc/systemd/system/vdo1.mount
[root@server1 ~]# vim /etc/systemd/system/vdo1.mount 
....

[root@server1 ~]# cat /etc/systemd/system/vdo1.mount 
[Unit]
Description = Mount filesystem that lives on VDO
name = vdo1.mount
Requires = vdo.service systemd-remount-fs.service
After = multi-user.target
Conflicts = umount.target
 
[Mount]
What = /dev/mapper/vdo1
Where = /vdo1
Type = xfs
Options = discard

[Install]
WantedBy = multi-user.target


[root@server1 ~]# systemctl enable --now vdo1.mount

[root@server1 ~]# vdostats --human-readable 
Device                    Size      Used Available Use% Space saving%
/dev/mapper/vdo1          5.0G      3.0G      2.0G  60%           99%

[root@server1 ~]# df -h /vdo1/
Filesystem        Size  Used Avail Use% Mounted on
/dev/mapper/vdo1  1.0T  7.2G 1017G   1% /vdo1

[root@server1 ~]# reboot

```