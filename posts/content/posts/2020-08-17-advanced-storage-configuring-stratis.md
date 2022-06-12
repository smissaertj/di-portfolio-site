---
title: "Advanced Storage: Configuring Stratis"
date: 2020-08-17
url: /advanced-storage-configuring-stratis
toc: false
images:
tags:
  - RHEL
  - Storage
  - Advanced Storage
  - Stratis
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}

Stratis, created as an answer to Btrfs and ZFS by Red Hat, is a volume-managing file system that introduces advanced storage features like:
* **Thin-provisioning**: The file system presents itself to users as much bigger than it really is. Useful in virtualized environments.
* **Snapshots**: Allows users to backup the current state of the file system and makes it easy to revert to a previous state.
* **Cache tier**: A Ceph storage feature that ensures data is stored physically closer to the Ceph client, making data access faster.
* **Programmatic API**: Storage can be configured and modified through API access, particularly useful in cloud environments.
* **Monitoring and repair**: Stratis has built-in features to monitor and repair the file system, compared to traditional file systems which would rely on tools like **fsck**. 



## Stratis Architecture

The lowest layer in the Stratis architecture is the pool, which is comparable to an LVM volume group. The pool represents all available storage and consists of one or more storage devices (referred to as *blockdev*). These block devices can be of any type, including LVM devices but *not* partitions, but cannot be thin-provisioned as Stratis creates volumes that are thing provisioned themselves. Stratis creates a `/stratis/poolname` directory for each pool, this directory contains links to devices that represent the file systems in the pool. 

From the Stratis pool file systems are created which live in a volume on top of the pool. A pool can contain one or more file systems. Stratis only works with XFS file systems and these are integrated within the Stratis volume: You should not reformat or reconfigure XFS file systems that are managed by Stratis. 

The file systems are thin-provisioned, they don't have a fixed size and grow automatically as more data is added to the file system.



## Creating and Mounting Stratis Storage

To create Stratis storage, we need to create a pool from a block device and add a file system on top of the pool. Block devices need to be 1GiB at a minimum. Note that a Stratis file systems occupies a minimum of 527MiB even if no data has been added. 

Let's make sure we have the `stratis-cli` and `stratisd` packages installed, then start and enable the `stratisd` daemon:
```
[root@server1 ~]# yum install stratis-cli stratisd
...
[root@server1 ~]# systemctl enable --now stratisd
[root@server1 ~]# systemctl status stratisd
● stratisd.service - A daemon that manages a pool of block devices to create flexible file systems
   Loaded: loaded (/usr/lib/systemd/system/stratisd.service; enabled; vendor preset: enabled)
   Active: active (running) since Wed 2020-08-19 12:25:50 EDT; 4s ago
```


We create a pool from one of the available block devices. Make sure the block device does not contain any file system (use `blkid -p /dev/sdx`) or partition table, if so we wipe them with the **wipefs** command, e.g `wipefs --all /dev/sdx`.
```
[root@server1 ~]# stratis pool create mypool1 /dev/sda
[root@server1 ~]# stratis pool list
Name     Total Physical Size  Total Physical Used
mypool1               10 GiB               52 MiB
```

Next, we create the `myfs1` file system on top of the `mypool1` pool:

```
[root@server1 ~]# stratis fs create mypool1 myfs1
[root@server1 ~]# stratis fs list
Pool Name  Name   Used     Created            Device                  UUID                            
mypool1    myfs1  545 MiB  Aug 19 2020 12:28  /stratis/mypool1/myfs1  ffdbb3a131f6421c990f69aa8d87c6aa
[root@server1 ~]#
```


To peristently mount a Stratis file system, the UUID must be used in the `/etc/fstab` file and the mount option `x-systemd.requires=stratisd.service` must be specified to ensure that Systemd waits to activate this device until the stratisd service is loaded:

```
[root@server1 ~]# blkid -p /stratis/mypool1/myfs1
/stratis/mypool1/myfs1: UUID="ffdbb3a1-31f6-421c-990f-69aa8d87c6aa" TYPE="xfs" USAGE="filesystem"

[root@server1 ~]# mkdir /mnt/myfs1
[root@server1 ~]# vim /etc/fstab
...
UUID=ffdbb3a1-31f6-421c-990f-69aa8d87c6aa       /mnt/myfs1      xfs     defaults,x-systemd.requires=stratisd.service    0 0
...
[root@server1 ~]# 
[root@server1 ~]# mount -a
[root@server1 ~]# reboot

```


## Managing Stratis

Traditional Linux tools cannot handle thin-provisioned volumes, we need to use the Stratis specific tools:
* **stratis blockdev**: Shows information about all block devices.
* **stratis pool**: Shows information about Stratis pools.
* **stratis fs**: Shows information about file systems.

You can use tab-completion on the above commands to reveal specific options. 

### Expanding and Renaming a Pool and File System
We can add a block device to a pool to expand the storage capacity of the pool using the **stratis pool add-data poolname blockdevice** command:

```
[root@server1 ~]# stratis pool list
Name     Total Physical Size  Total Physical Used
mypool1               10 GiB              597 MiB
  
[root@server1 ~]# stratis pool add-data mypool1 /dev/sdb

[root@server1 ~]# stratis pool list
Name     Total Physical Size  Total Physical Used
mypool1               15 GiB              601 MiB
```


### Destroying a Pool and File System
To destroy a pool and file system, we need to unmount the file system first. Then use the **stratis fs destroy poolname fsname** command, followed by the **stratis pool destroy poolname** command:

```
[root@server1 ~]# stratis fs list
Pool Name  Name   Used     Created            Device                  UUID                            
mypool1    myfs1  545 MiB  Aug 19 2020 12:28  /stratis/mypool1/myfs1  ffdbb3a131f6421c990f69aa8d87c6aa

[root@server1 ~]# umount /stratis/mypool1/myfs1
[root@server1 ~]# stratis fs destroy mypool1 myfs1

[root@server1 ~]# stratis fs list
Pool Name  Name  Used  Created  Device  UUID

[root@server1 ~]# stratis pool list
Name     Total Physical Size  Total Physical Used
mypool1               15 GiB               56 MiB

[root@server1 ~]# stratis pool destroy mypool1 

[root@server1 ~]# stratis pool list
Name  Total Physical Size  Total Physical Used
[root@server1 ~]#
```



### Creating and Accessing a Stratis Snapshot
In Stratis, a snapshot is a regular Stratis file system created as a copy of another Stratis file system. The snapshot initially contains the same file content as the original file system, but can change as the snapshot is modified. Whatever changes you make to the snapshot will not be reflected in the original file system. 

To create a Stratis snapshot, use **stratis fs snapshot poolname fsname snapshotname**.
To access the snapshot, mount it as a regular file system from the /stratis/my-pool/ directory: **mount /stratis/poolname/snapshotname mount-point**

```
[root@server1 ~]# stratis pool create mypool1 /dev/sda
[root@server1 ~]# stratis pool add-data mypool1 /dev/sdb
[root@server1 ~]# stratis pool list
Name     Total Physical Size  Total Physical Used
mypool1               15 GiB               56 MiB

[root@server1 ~]# stratis fs create mypool1 myfs1
[root@server1 ~]# stratis fs list
Pool Name  Name   Used     Created            Device                  UUID                            
mypool1    myfs1  545 MiB  Aug 19 2020 13:16  /stratis/mypool1/myfs1  d9e0c47f26e44e0b8990a6aa7546d0f7

[root@server1 ~]# stratis fs snapshot mypool1 myfs1 myfs1snapshot
[root@server1 ~]# stratis fs list
Pool Name  Name           Used     Created            Device                          UUID                            
mypool1    myfs1          545 MiB  Aug 19 2020 13:16  /stratis/mypool1/myfs1          d9e0c47f26e44e0b8990a6aa7546d0f7
mypool1    myfs1snapshot  545 MiB  Aug 19 2020 13:17  /stratis/mypool1/myfs1snapshot  b2fb662124a4424c9d21429012fcfdc4

[root@server1 ~]# mkdir -p /mnt/myfs1snapshot
[root@server1 ~]# mount /stratis/mypool1/myfs1snapshot /mnt/myfs1snapshot/
[root@server1 ~]# umount /mnt/myfs1snapshot
[root@server1 ~]# mount /stratis/mypool1/myfs1 /mnt/myfs1
[root@server1 ~]#

```


### Reverting a Stratis File System to a Previous Snapshot
It's a good idea to backup the current file system before reverting to a previous snapshot:

```
[root@server1 ~]# stratis fs snapshot mypool1 myfs1 myfs1snapshot2
[root@server1 ~]#
```

Next, we unmount and remove the original file system:
```
[root@server1 ~]# umount /mnt/myfs1
[root@server1 ~]# stratis fs destroy mypool1 myfs1
[root@server1 ~]#

```

We create a copy of a previous snapshot which we wish to restore, under the name of the original file system:
```
[root@server1 ~]# stratis fs list
Pool Name  Name            Used     Created            Device                           UUID                            
mypool1    myfs1snapshot2  545 MiB  Aug 19 2020 13:23  /stratis/mypool1/myfs1snapshot2  f54d88f686d64acd94c3a7d73dac92f5
mypool1    myfs1snapshot   545 MiB  Aug 19 2020 13:17  /stratis/mypool1/myfs1snapshot   b2fb662124a4424c9d21429012fcfdc4

[root@server1 ~]# stratis fs snapshot mypool1 myfs1snapshot myfs1
[root@server1 ~]# stratis fs list
Pool Name  Name            Used     Created            Device                           UUID                            
mypool1    myfs1snapshot2  545 MiB  Aug 19 2020 13:23  /stratis/mypool1/myfs1snapshot2  f54d88f686d64acd94c3a7d73dac92f5
mypool1    myfs1           545 MiB  Aug 19 2020 13:31  /stratis/mypool1/myfs1           82f75da64c744079b1c2ae51792812a0
mypool1    myfs1snapshot   545 MiB  Aug 19 2020 13:17  /stratis/mypool1/myfs1snapshot   b2fb662124a4424c9d21429012fcfdc4
```

We mount the snapshot, now accessible with the same name as the original file system:
```
[root@server1 ~]# mount /stratis/mypool1/myfs1 /mnt/myfs1
[root@server1 ~]#
```


### Removing a Stratis Snapshot

We remove a Stratis snapshot by unmounting it first if required, then using the **stratis fs destroy poolname snapshotname** command.
```
[root@server1 ~]# stratis fs destroy mypool1 myfs1snapshot2
[root@server1 ~]#
```