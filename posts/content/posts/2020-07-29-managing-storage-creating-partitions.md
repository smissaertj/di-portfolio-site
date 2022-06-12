---
title: "Managing Storage: Creating Partitions"
date: 2020-07-29T16:05:02+04:00
url: /managing-storage-creating-partitions
draft: false
toc: false
images:
tags:
  - RHEL
  - Storage
  - Partitions
  - MBR
  - GPT
  - fdisk
  - gdisk
  - parted
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


To match the different partition types we use different partitioning utilities.
The `fdisk` utlity is used to create MBR partitions while the `gdisk` utility is used to create GPT paritions.  

Apart from `fdisk` and `gdisk`, there is the `parted` command which can create both MBR and GPT partitions but has less advanced features.

Each command takes a disk device name as an argument. The device names are usually `/dev/sda`, `/dev/sdb`, ... in the order the device is recognized by the kernel. You can have disks up to `/dev/sdz` and beyond: `/dev/sdaa`, `/dev/sdab`, ...

Partitions are numbered, the `/dev/sda` device contains partitions like `/dev/sda1` , `/dev/sda2`, ...

The name of the device also depends on the type of driver that's used:

{{<table "table table-dark table-striped table-bordered">}}
Device Name | Description
-------|------
/dev/sda | Devices that use the SCSI driver, used for both SCSI and SATA devices. This is common on physical machines but also on VMware virtual machines.
/dev/nvme0n1 | The first hard disk on an NVME Express interface. Note that the first drive is referred to as `n1` instead of `a`. 
/dev/hda | Legacy IDE disk devices.
/dev/vda | Common on KVM virtual machines using the virtio disk driver.
/dev/xvda | A disk in a Xen virtual machine that uses the Xen virtual disk driver.
{{</table>}}



## Creating MBR Partitions with fdisk
Next, I will show you how to use `fdisk` to create a partition on nonpartitioned disk space. If you don't have nonpartitioned disk space the same principle can be applied to a separate virtual disk. Make sure to create a snapshot of your virtual machine so you can easily revert back.

The `lsblk` command shows me I have two disks: `vda` and `vdb`, where `vda` contains two partitions:
```
[root@server1 ~]# lsblk
NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
sr0     11:0    1   7G  0 rom  
vda    253:0    0  30G  0 disk 
├─vda1 253:1    0  18G  0 part /
└─vda2 253:2    0   2G  0 part [SWAP]
vdb    253:16   0  10G  0 disk 
```

`df -h` shows me the available disk space on each disk, for `/dev/vda` that would be 7.2Gb. There's no file system yet on `/dev/vdb` so it's not showing anything for this disk.

```
[root@server1 ~]# df -h
Filesystem      Size  Used Avail Use% Mounted on
devtmpfs        899M     0  899M   0% /dev
tmpfs           915M     0  915M   0% /dev/shm
tmpfs           915M  1.6M  914M   1% /run
tmpfs           915M     0  915M   0% /sys/fs/cgroup
/dev/vda1        18G   11G  7.2G  61% /
tmpfs           183M   12K  183M   1% /run/user/42
tmpfs           183M   28K  183M   1% /run/user/1000
```

Let's run the `fdisk` command against the `/dev/vda` disk and print out the current disk allocation:
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

Command (m for help): 
```

We can see that this disk has 62914560 sectors and that the last partition does not end on the last sector
This confirms again we have free disk space available to create a new partition.

Type `n` to create a new partition, followed by `p` to create a primary partition. You can choose the new parition number or hit enter to accept the default.

```
Command (m for help): n
Partition type
   p   primary (2 primary, 0 extended, 2 free)
   e   extended (container for logical partitions)
Select (default p): p
Partition number (3,4, default 3): 3
```

`fdisk` will suggest the first available sector, you can accept that by hitting enter.
For the last sector (which will ultimately determine the size), you can choose to accept the default to create a partition on all remaining disk space, or you can specify the last sector (using `+numberofsectors`) or specify a size using `+number(K,M,G)`, i.e. `+1G` will make the partition 1GiB in size.


```
First sector (41945088-62914559, default 41945088): 
Last sector, +sectors or +size{K,M,G,T,P} (41945088-62914559, default 62914559): +1G

Created a new partition 3 of type 'Linux' and of size 1 GiB.
```
By default a Linux parition type is used. You can change the type using the `t` command. In this case we'll continue to use the Linux type.

Use the `p` command to print the disk allocation again:

```
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
/dev/vda3       41945088 44042239  2097152   1G 83 Linux
```

Once we're happy with the modifications, we use `w` to write them to disk and exit `fdisk`.  
(Type `q` at anytime if you need to quit `fdisk` without writing your changes.)
```
Command (m for help): w
The partition table has been altered.
Syncing disks.
```

It's possible you'll receive the following warning message:
```
WARNING: Re-reading the partition table failed with error 16: Device or resource busy.
The kernel still uses the old table. The new table will be used at the next reboot or after you run partprobe(8) or kpartx(8).
```

This means the partition table was written succesfully, but the in-memory kernel partition could not be updated.
You can check this by comparing the output of `fdisk -l /dev/vda` with `cat /proc/partitions`.  
Run `partprobe /dev/vda` to write the changes to the in-memory kernel parition table.
Typically this happens when you add partitions to a disk that already has mounted partitions.

### Using Extended and Logical Partitions on MBR
If three partitions have been created already, there is room for 1 more primary partition. If you need to go beyond 4 partitions on an MBR disk you will have to create an extended partition and create logical partitions within it.  

If something goes wrong with your extended partition you will have a problem with all logical partitions as well. With this in mind you might be better off using LVM, which I'll discuss later on in a different post.

> An extended partition is used only for the purpose of creating logical partitions. Consider it as a container for the logical partitions, you can't create a filesystem directly on the extended partition.

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
/dev/vda3       41945088 44042239  2097152   1G 83 Linux

Command (m for help): n
Partition type
   p   primary (3 primary, 0 extended, 1 free)
   e   extended (container for logical partitions)
Select (default e): e

Selected partition 4
First sector (44042240-62914559, default 44042240): 
Last sector, +sectors or +size{K,M,G,T,P} (44042240-62914559, default 62914559): 

Created a new partition 4 of type 'Extended' and of size 9 GiB.

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
/dev/vda3       41945088 44042239  2097152   1G 83 Linux
/dev/vda4       44042240 62914559 18872320   9G  5 Extended

Command (m for help): n
All primary partitions are in use.
Adding logical partition 5
First sector (44044288-62914559, default 44044288): 
Last sector, +sectors or +size{K,M,G,T,P} (44044288-62914559, default 62914559): +5G

Created a new partition 5 of type 'Linux' and of size 5 GiB.

Command (m for help): n
All primary partitions are in use.
Adding logical partition 6
First sector (54532096-62914559, default 54532096): 
Last sector, +sectors or +size{K,M,G,T,P} (54532096-62914559, default 62914559): 

Created a new partition 6 of type 'Linux' and of size 4 GiB.

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
/dev/vda3       41945088 44042239  2097152   1G 83 Linux
/dev/vda4       44042240 62914559 18872320   9G  5 Extended
/dev/vda5       44044288 54530047 10485760   5G 83 Linux
/dev/vda6       54532096 62914559  8382464   4G 83 Linux

Command (m for help): w
The partition table has been altered.
Failed to add partition 5 to system: Device or resource busy
Failed to add partition 6 to system: Device or resource busy

The kernel still uses the old partitions. The new table will be used at the next reboot. 
Syncing disks.

[root@server1 ~]# fdisk -l /dev/vda
Disk /dev/vda: 30 GiB, 32212254720 bytes, 62914560 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0xde6faae3

Device     Boot    Start      End  Sectors Size Id Type
/dev/vda1  *        2048 37750783 37748736  18G 83 Linux
/dev/vda2       37750784 41945087  4194304   2G 82 Linux swap / Solaris
/dev/vda3       41945088 44042239  2097152   1G 83 Linux
/dev/vda4       44042240 62914559 18872320   9G  5 Extended
/dev/vda5       44044288 54530047 10485760   5G 83 Linux
/dev/vda6       54532096 62914559  8382464   4G 83 Linux


[root@server1 ~]# cat /proc/partitions
major minor  #blocks  name

 253        0   31457280 vda
 253        1   18874368 vda1
 253        2    2097152 vda2
 253        3    1048576 vda3
 253        4    9436160 vda4
 253       16   10485760 vdb
  11        0    7377920 sr0
[root@server1 ~]# partprobe /dev/vda
Error: Partition(s) 5, 6 on /dev/vda have been written, but we have been unable to inform the kernel of the change, probably because it/they are in use.  As a result, the old partition(s) will remain in use.  You should reboot now before making further changes.
[root@server1 ~]# reboot
```

>Since we're getting an error using partprobe, we **should** reboot and not continue modifying or managing partitions.


## Creating GPT Partitions with gdisk
If a disk is configured with a GUID Partition Table or if the disk has a size that goes beyond 2TiB you need to manage partitions with the `gdisk` utility.

> Never use `gdisk` on a disk that has been formatted with `fdisk` and already contains `fdisk` partitions. `gdisk` will detect MBR is present and convert this to GPT after which your computer will likely not boot anymore.

```
[root@server1 ~]# gdisk /dev/vda
GPT fdisk (gdisk) version 1.0.3

Partition table scan:
  MBR: MBR only
  BSD: not present
  APM: not present
  GPT: not present


***************************************************************
Found invalid GPT and valid MBR; converting MBR to GPT format
in memory. THIS OPERATION IS POTENTIALLY DESTRUCTIVE! Exit by
typing 'q' if you don't want to convert your MBR partitions
to GPT format!
***************************************************************


Warning! Secondary partition table overlaps the last partition by
33 blocks!
You will need to delete this partition or resize it in another utility.

Command (? for help): q
```

In the following example, I'll create a GPT layout on a new disk, `/dev/vdb`:

```
[root@server1 ~]# gdisk /dev/vdb
GPT fdisk (gdisk) version 1.0.3

Partition table scan:
  MBR: not present
  BSD: not present
  APM: not present
  GPT: not present

Creating new GPT entries.
```

Type `p` to print the current disk allocation:

```
Command (? for help): p
Disk /dev/vdb: 20971520 sectors, 10.0 GiB
Sector size (logical/physical): 512/512 bytes
Disk identifier (GUID): 32689440-34F8-4D19-8FCC-0FA78AFFCAF5
Partition table holds up to 128 entries
Main partition table begins at sector 2 and ends at sector 33
First usable sector is 34, last usable sector is 20971486
Partitions will be aligned on 2048-sector boundaries
Total free space is 20971453 sectors (10.0 GiB)

Number  Start (sector)    End (sector)  Size       Code  Name

```


Type `n` to create a new partition, accept the default partition number that is suggested.
Accept the default suggested First sector.
The last sector should be set at 1GiB.

By default the Linux partition type is selected. Accept or type `l` to show other parition types.
Relevant partition types are as follows:
* **8200** Linux Swap
* **8300** Linux File System
* **8e00** Linux LVM

These are the same types as the ones used in MBR, except that two 0s are added to the ID.
```
Command (? for help): n
Partition number (1-128, default 1): 
First sector (34-20971486, default = 2048) or {+-}size{KMGTP}: 
Last sector (2048-20971486, default = 20971486) or {+-}size{KMGTP}: +1G
Current type is 'Linux filesystem'
Hex code or GUID (L to show codes, Enter = 8300): 
Changed type of partition to 'Linux filesystem'
```

Check the partition by printing the disk allocation:

```
Command (? for help): p
Disk /dev/vdb: 20971520 sectors, 10.0 GiB
Sector size (logical/physical): 512/512 bytes
Disk identifier (GUID): 32689440-34F8-4D19-8FCC-0FA78AFFCAF5
Partition table holds up to 128 entries
Main partition table begins at sector 2 and ends at sector 33
First usable sector is 34, last usable sector is 20971486
Partitions will be aligned on 2048-sector boundaries
Total free space is 18874301 sectors (9.0 GiB)

Number  Start (sector)    End (sector)  Size       Code  Name
   1            2048         2099199   1024.0 MiB  8300  Linux filesystem
```

Type `w` to write your changes.

```
Command (? for help): w

Final checks complete. About to write GPT data. THIS WILL OVERWRITE EXISTING
PARTITIONS!!

Do you want to proceed? (Y/N): y
OK; writing new GUID partition table (GPT) to /dev/vdb.
The operation has completed successfully.
```
Again, if you get an error message indicating that the partition table is in use, type `partprobe` to update the kernel partition table and reboot if required.

```
[root@server1 ~]# lsblk
NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
sr0     11:0    1   7G  0 rom  
vda    253:0    0  30G  0 disk 
├─vda1 253:1    0  18G  0 part /
├─vda2 253:2    0   2G  0 part [SWAP]
├─vda3 253:3    0   1G  0 part 
├─vda4 253:4    0   1K  0 part 
├─vda5 253:5    0   5G  0 part 
└─vda6 253:6    0   4G  0 part 
vdb    253:16   0  10G  0 disk 
└─vdb1 253:17   0   1G  0 part 
```

```
[root@server1 ~]# cat /proc/partitions 
major minor  #blocks  name

 253        0   31457280 vda
 253        1   18874368 vda1
 253        2    2097152 vda2
 253        3    1048576 vda3
 253        4          1 vda4
 253        5    5242880 vda5
 253        6    4191232 vda6
 253       16   10485760 vdb
 253       17    1048576 vdb1
  11        0    7377920 sr0
```



## Creating GPT Partitions with parted
The `parted` utility uses an interactive shell, it's considered to be the default utility on RHEL 8 but it lacks advanced features.

I've deleted the partion I created previously with `gdisk` and I'll recreate it using `parted`:

```
[root@server1 ~]# parted /dev/vdb
GNU Parted 3.2
Using /dev/vdb
Welcome to GNU Parted! Type 'help' to view a list of commands.
```

`print` the current disk allocation table:

```                                                     
(parted) print                                                                
Model: Virtio Block Device (virtblk)
Disk /dev/vdb: 10.7GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start  End  Size  File system  Name  Flags


```

Type `mklabel` and press Enter. You'll be prompted for a disk label type, press the Tab key twice to see a list of available disk label types. Choose the `gpt` type and press Enter.

```
(parted) mklabel                                                          
New disk label type?                                                      
aix    amiga  atari  bsd    dvh    gpt    loop   mac    msdos  pc98   sun    
New disk label type? gpt
Warning: The existing disk label on /dev/vdb will be destroyed and all data on this disk will be lost. Do you want to continue?
Yes/No? yes                                                               
```

Type `mkpart`, the utility prompts for a partition name. I've named by partition _backup_.

```
(parted) mkpart                                                           
Partition name?  []? backup
```

Notice you're prompted for a file system type, it suggest we're applying a file system here but this is ***not*** the case.
Documentation suggest this setting isn't used, you could accept the default, but it's suggested to use Tab completion and choose a file system type comes close to what you're going to use on the partition later when actually creating the file system. 

```
File system type?  [ext2]?                                                
affs0            affs3            affs6            amufs0           amufs3           apfs1            btrfs            ext4             hfs              hp-ufs           linux-swap(new)  linux-swap(v1)   reiserfs         xfs              
affs1            affs4            affs7            amufs1           amufs4           apfs2            ext2             fat16            hfs+             jfs              linux-swap(old)  nilfs2           sun-ufs          
affs2            affs5            amufs            amufs2           amufs5           asfs             ext3             fat32            hfsx             linux-swap       linux-swap(v0)   ntfs             swsusp           
File system type?  [ext2]? xfs
```

We can specify the start location as a number of blocks or an offset from the start of the device like `1MiB`, not `+1MiB`.
We'll make the partition 5GiB in size, so we specify the `5Gib` offset for the end value. 

```
Start? 1MiB
End? 5GiB
```

Type `print` to see the modifications and `quit` to quit the utility and commit changes.

```                                                                 
(parted) print                                                            
Model: Virtio Block Device (virtblk)
Disk /dev/vdb: 10.7GB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start   End     Size    File system  Name    Flags
 1      1049kB  5369MB  5368MB  xfs          backup

(parted) quit                                                             
Information: You may need to update /etc/fstab.
```


```
[root@server1 ~]# lsblk
NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
sr0     11:0    1   7G  0 rom  
vda    253:0    0  30G  0 disk 
├─vda1 253:1    0  18G  0 part /
├─vda2 253:2    0   2G  0 part [SWAP]
├─vda3 253:3    0   1G  0 part 
├─vda4 253:4    0   1K  0 part 
├─vda5 253:5    0   5G  0 part 
└─vda6 253:6    0   4G  0 part 
vdb    253:16   0  10G  0 disk 
└─vdb1 253:17   0   5G  0 part 
[root@server1 ~]#
```