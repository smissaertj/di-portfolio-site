---
title: "Managing Storage: Creating & Mounting File Systems"
date: 2020-07-31
url: /managing-storage-creating-mounting-file-systems
draft: false
toc: false
images:
tags:
  - RHEL
  - Storage
  - File Systems
  - Mount
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


Partitions by themselves aren't of any use if they don't contain a file system. On RHEL 8 different file systems can be used, the default being **xfs**. To format a partition with one of the supported file systems we can use the `mkfs` command followed by the `-t` option to specify a specific file system. Alternatively, you can use a file system-specific tool like `mkfs.xfs` to format an **xfs** file system or `mkfs.ext4` to format an **Ext4** file system.

> If you use `mkfs` without specifying what file system to format, the **Ext2** file system is used.


Among the supported file systems, we can distuinguish Journaling, Non-Journaling and FAT File Systems:
* **Non-Journaling**:
  * Ext2 - Extended File System 2, Legacy Linux file system. There is no use for this on RHEL 8.

* **Journaling**:  _Uses a journal to keep track of changes that have not been written to the file system. This provides some protection for file corruption during system crashes and unexpected shutdowns_
  * Ext3 - Previous version of Ext4. There is no use for this on RHEL 8.
  * Ext4 - The default file system in previous versions of RHEL. Still supported on RHEL 8.
  * XFS - The default RHEL 8 file system.
  * BTRFS:
    * Uses Copy on Write (CoW), a resource management technique.
    * Uses Subvolumes: Similar to a partition, but can be accessed like a directory.
    * Snapshots: Subvolumes that reference the original data's location, metadata and directory structure.

* **File Allocation Table file systems**
  * Linux can use VFAT (Virtual File Allocation TAble) which allows longer file names.
  * EFI Boot partitions _need_ to use a FAT partition (VFAT on Linux)
  * ex-FAT - Extended FAT file system: Allows files larger than 2Gb.


```
[root@server1 ~]# mkfs -t xfs /dev/vda3
meta-data=/dev/vda3              isize=512    agcount=4, agsize=131072 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=1, sparse=1, rmapbt=0
         =                       reflink=1
data     =                       bsize=4096   blocks=524288, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=2560, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
```

Remember you can't format a file system onto an Extended partition, it contains the partition table for the Logical partitions.
```
[root@server1 ~]# mkfs.xfs /dev/vda4
mkfs.xfs: /dev/vda4 appears to contain a partition table (dos).
mkfs.xfs: Use the -f option to force overwrite.
```

```
[root@server1 ~]# mkfs.xfs /dev/vda5
meta-data=/dev/vda5              isize=512    agcount=4, agsize=262144 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=1, sparse=1, rmapbt=0
         =                       reflink=1
data     =                       bsize=4096   blocks=1048576, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=2560, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
```

## Changing File System Properties

File system properties can be managed using different tools specific for the file system you're using.

### Managing Ext4 File System Properties

The generic tool for managing Ext4 file system properties is **tune2fs**. This tool was developped for Ext2 but is fully compatible with Ext3 and Ext4.  

`tune2fs -l` shows the different file system properties:
```
[root@server1 ~]# tune2fs -l /dev/vdb1
tune2fs 1.44.6 (5-Mar-2019)
Filesystem volume name:   <none>
Last mounted on:          <not available>
Filesystem UUID:          492d646a-950d-49da-a3f3-62f0872a9f4b
Filesystem magic number:  0xEF53
Filesystem revision #:    1 (dynamic)
Filesystem features:      has_journal ext_attr resize_inode dir_index filetype extent 64bit flex_bg sparse_super large_file huge_file dir_nlink extra_isize metadata_csum
Filesystem flags:         signed_directory_hash 
Default mount options:    user_xattr acl
Filesystem state:         clean
Errors behavior:          Continue
Filesystem OS type:       Linux
Inode count:              655360
Block count:              2621179
Reserved block count:     131058
Free blocks:              2554426
Free inodes:              655349
First block:              0
Block size:               4096
Fragment size:            4096
Group descriptor size:    64
Reserved GDT blocks:      1024
Blocks per group:         32768
Fragments per group:      32768
Inodes per group:         8192
Inode blocks per group:   512
Flex block group size:    16
Filesystem created:       Fri Jul 31 20:51:26 2020
Last mount time:          n/a
Last write time:          Fri Jul 31 21:01:22 2020
Mount count:              0
Maximum mount count:      -1
Last checked:             Fri Jul 31 20:51:26 2020
Check interval:           0 (<none>)
Lifetime writes:          68 MB
Reserved blocks uid:      0 (user root)
Reserved blocks gid:      0 (group root)
First inode:              11
Inode size:           256
Required extra isize:     32
Desired extra isize:      32
Journal inode:            8
Default directory hash:   half_md4
Directory Hash Seed:      5613adcb-e707-4a6d-8559-53c1f238609d
Journal backup:           inode blocks
Checksum type:            crc32c
Checksum:                 0x4828a56a
```
Interesting properties are the file system label (showing as Filesystem volume name), File System features and Default mount option:

* Use `tune2fs -o` to set default file system mount option:  
  * `tune2fs -o acl,user_xatrr /dev/vdb1` to switch on access control lists and user extended attributes.  
  * `tune2fs -o ^acl,user_xattr /dev/vdb1` to switch off the same options.
* Use `tune2fs -O` to set or unset file system features:
  * `tune2fs -O ^dir_index /dev/vdb1`
  * `tune2fs -O dir_index /dev/vdb1`
* Use `tune2fs -L` or `e2label2` to set a file system label:
  * `tune2fs -L MyData /dev/vdb1`
* Use `tune2fs -i` to set file system checks intervals:
  * `tune2fs -i 3w /dev/vdb1` sets the interval to 1814400 seconds, or 3 weeks.

>File system labels or volume names will come in handy when mounting file systems. We can use the label instead of the device name for consistent mounting, even if the underlying device name changes.




### Managing XFS File System Properties
The XFS file system is completely different, you can not set file system attributes within the file system metadata. You can however change some XFS properties, like the volume label, using the `xfs_admin` command:

```
[root@server1 ~]# xfs_admin -L XFS_Disk /dev/vda3
writing all SBs
new label = "XFS_Disk"

[root@h ~]# blkid | grep vda3
/dev/vda3: LABEL="XFS_Disk" UUID="1e235236-8dfa-42d3-9948-826df137780c" TYPE="xfs" PARTUUID="de6faae3-03"

[root@server1 ~]# xfs_admin -l /dev/vda3
label = "XFS_Disk"
```

## Adding Swap Files and Partitions

Using swap on Linux is a convenient way to improve kernel memory usage. If a shortage of physical RAM occurs, non-recently used memory pages can be moved to swap space to make more RAM available for other programs. However, intensive usage of swap space could indicate a potential problem, swap space should be closely monitored.

Swap space is either created by formatting a partition with the swap partition type, or creating a swap file and formatting the file as swap space. From a performance point of view it doesn't make much difference if a swap partition or a swap file is being used. 
A swap file could be helpful if you need to increase swap space, but you don't have free disk space to create a partition.


For a swap partition, use `fdisk` or `gdisk` depending on the partition table:
```
[root@server1 ~]# fdisk /dev/vda

Welcome to fdisk (util-linux 2.32.1).
Changes will remain in memory only, until you decide to write them.
Be careful before using the write command.


Command (m for help): p
Disk /dev/vda: 30 GiB, 32212254720 bytes, 62914560 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0xde6faae3

Device     Boot    Start      End  Sectors Size Id Type
/dev/vda1  *        2048 37750783 37748736  18G 83 Linux
/dev/vda2       37750784 41945087  4194304   2G 82 Linux swap / Solaris

Command (m for help): n
Partition type
   p   primary (2 primary, 0 extended, 2 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (3,4, default 3): 
First sector (41945088-62914559, default 41945088): 
Last sector, +sectors or +size{K,M,G,T,P} (41945088-62914559, default 62914559): +2G

Created a new partition 3 of type 'Linux' and of size 2 GiB.

Command (m for help): t
Partition number (1-3, default 3): 
Hex code (type L to list all codes): 82

Changed type of partition 'Linux' to 'Linux swap / Solaris'.

Command (m for help): w
The partition table has been altered.
Syncing disks.

[root@server1 ~]# mkswap /dev/vda3
Setting up swapspace version 1, size = 2 GiB (2147479552 bytes)
no label, UUID=61fc53d7-f385-4c79-94bd-69b33010c09a

[root@server1 ~]# free -m
              total        used        free      shared  buff/cache   available
Mem:           1829        1015         191          21         622         642
Swap:          2047           0        2047

[root@server1 ~]# swapon /dev/vda3
[root@server1 ~]# free -m
              total        used        free      shared  buff/cache   available
Mem:           1829        1017         189          21         622         640
Swap:          4095           0        4095
[root@server1 ~]#

```

To add a swap file, create the file first. The below `dd` command creates a file containing 512 blocks of 1MiB containing all zeroes.
```
[root@server1 ~]# dd if=/dev/zero of=/swapfile bs=1M count=512
512+0 records in
512+0 records out
536870912 bytes (537 MB, 512 MiB) copied, 6.28219 s, 85.5 MB/s

[root@server1 ~]# chmod 0600 /swapfile 
[root@server1 ~]# mkswap /swapfile
Setting up swapspace version 1, size = 512 MiB (536866816 bytes)
no label, UUID=0f2316f3-d713-4752-be6b-74584092c193

[root@server1 ~]# swapon /swapfile
[root@server1 ~]# free -m
              total        used        free      shared  buff/cache   available
Mem:           1829        1002         170          12         655         664
Swap:          4607          35        4572
```

# Mounting File Systems

To use a partition we have to mount it to make its content available through a specific directory.
In order to do so, we need specific information:
* **What** - Mandatory information that specifies what device we want to mount.
* **Where** - Mandatory information that specifies the directory on wich we want to mount our device.
* **File System** - Optional. Typically the **mount** command will detect the proper file system.
* **Options** - Optional but depends on the needs you have for the file system.

To mount a file system, the **mount** command is used, to unmount a file system the **umount** command is used:
```
[root@server1 ~]# mkdir /ext4dir
[root@server1 ~]# mount /dev/vdb1 /ext4dir

[root@server1 ~]# lsblk
NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
sr0     11:0    1   7G  0 rom  
vda    253:0    0  30G  0 disk 
├─vda1 253:1    0  18G  0 part /
├─vda2 253:2    0   2G  0 part [SWAP]
└─vda3 253:3    0   2G  0 part [SWAP]
vdb    253:16   0  10G  0 disk 
└─vdb1 253:17   0  10G  0 part /ext4dir

[root@server1 ~]# umount /ext4dir 
[root@server1 ~]# lsblk
NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
sr0     11:0    1   7G  0 rom  
vda    253:0    0  30G  0 disk 
├─vda1 253:1    0  18G  0 part /
├─vda2 253:2    0   2G  0 part [SWAP]
└─vda3 253:3    0   2G  0 part [SWAP]
vdb    253:16   0  10G  0 disk 
└─vdb1 253:17   0  10G  0 part 
[root@server1 ~]#
```
Note that for unmounting, both `umount /dev/vdb1` or `umount /ext4dir` would work.

## Device Names, UUIDs, or Disk Labels
Typically we use device names like `/dev/vdb1` to mount devices. If you're in a environment where a dynamic storage topology is being used this is not a good approach, since device names may change after e.g. a server reboot. 

On a default RHEL 8 installation, Universally Unique Identifiers are used for every file system. This may not be handy when manually mounting, but does make sense when automating file system mounts. Before the use of UUIDs was common, file systems were often mounted via their Volume Name or Disk Label. Both the UUID and the Disk Label can be seen using the **blkid** command:

```
[root@server1 ~]# blkid
/dev/vda1: UUID="658aed1c-058c-42a6-bce1-ffcf41426b53" TYPE="xfs" PARTUUID="de6faae3-01"
/dev/vda2: UUID="c8ad4b20-2469-4caf-aa30-1a99d16870d9" TYPE="swap" PARTUUID="de6faae3-02"
/dev/vda3: UUID="61fc53d7-f385-4c79-94bd-69b33010c09a" TYPE="swap" PARTUUID="de6faae3-03"
/dev/vdb1: LABEL="ext4disk" UUID="492d646a-950d-49da-a3f3-62f0872a9f4b" TYPE="ext4" PARTLABEL="Linux filesystem" PARTUUID="e8063de5-2db0-455b-a50b-a3b2f69e857c"

[root@server1 ~]# mount UUID="492d646a-950d-49da-a3f3-62f0872a9f4b" /ext4dir
[root@server1 ~]# umount /ext4dir
[root@server1 ~]# mount LABEL="ext4disk" /ext4dir
[root@server1 ~]#
```

## Automating File System Mounts Through /etc/fstab

Usually you would want to mount file systems automatically, the classical way of doing this is through the `/etc/fstab` file. This file specifies everything needed to mount file systems:

```
[root@server1 ~]# cat /etc/fstab

#
# /etc/fstab
# Created by anaconda on Mon Jun 22 03:30:44 2020
#
# Accessible filesystems, by reference, are maintained under '/dev/disk/'.
# See man pages fstab(5), findfs(8), mount(8) and/or blkid(8) for more info.
#
# After editing this file, run 'systemctl daemon-reload' to update systemd
# units generated from this file.
#
UUID=658aed1c-058c-42a6-bce1-ffcf41426b53 /                       xfs     defaults        0 0
UUID=c8ad4b20-2469-4caf-aa30-1a99d16870d9 swap                    swap    defaults        0 0
```

Each line in the file constains six fields:

{{<table "table table-dark table-striped table-bordered">}}
Field | Description
-------|------
Device | A device name, UUID or label.
Mount Point | A directory or kernel interface where the device needs to be mounted.
File System | The file system type.
Mount Options | The mount options applied to the file system.
Dump Support | Set to 1 to enable support using the **dump** utility. Necessary for some backup solutions.
Automatic Check | File system integrity check. **0** to disable automated checks, **1** if this is the root file system to be checked automatically, **2** for all other file systems that need automatic checking while booting. Network file systems should have this option set to **0**.
{{</table>}}

>The **xfs** file system does not support file system checks, so in this case the Automatic Check field should be set to `0`.

Not all file systems use a directory as a mount point, e.g. system devices like swap use a kernel interface. You can easily recognize kernel interfaces, their name doesn't start with a `/` like a directory (and it doesn't exist in the file system).


The Mount Options field defines specific moutn options, if no options are required then this field will read "defaults". The following common mount options can be used:

{{<table "table table-dark table-striped table-bordered">}}
Option | Description
-------|------
auto/noauto | The file system will (not) be mounted automatically.
acl | Adds support for Access Control Lists.
user_xattr | Adds support for user-extended attributes.
ro | Mounts the file system in read only mode.
atime/noatime | Enables or disables access time modifications.
exec/noexec | Allows or denies execution of program files from the file system.
_netdev | To mount a network file system. This tells fstab to wait until the network is available before mounting.
{{</table>}}

```
[root@localhost ~]# cat /etc/fstab 

#
# /etc/fstab
# Created by anaconda on Mon Jun 22 03:30:44 2020
#
# Accessible filesystems, by reference, are maintained under '/dev/disk/'.
# See man pages fstab(5), findfs(8), mount(8) and/or blkid(8) for more info.
#
# After editing this file, run 'systemctl daemon-reload' to update systemd
# units generated from this file.
#
UUID=658aed1c-058c-42a6-bce1-ffcf41426b53 /                       xfs     defaults        0 0
UUID=c8ad4b20-2469-4caf-aa30-1a99d16870d9 swap                    swap    defaults        0 0
UUID=492d646a-950d-49da-a3f3-62f0872a9f4b /ext4dir  ext4  defaults  0 0
/swapfile swap  swap  defaults  0 0
```

```
[root@localhost ~]# mount -a
[root@localhost ~]# lsblk
NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
sr0     11:0    1   7G  0 rom  /run/media/student/CentOS-8-1-1911-x86_64-dvd
vda    253:0    0  30G  0 disk 
├─vda1 253:1    0  18G  0 part /
├─vda2 253:2    0   2G  0 part [SWAP]
└─vda3 253:3    0   2G  0 part [SWAP]
vdb    253:16   0  10G  0 disk 
└─vdb1 253:17   0  10G  0 part /ext4dir
```





