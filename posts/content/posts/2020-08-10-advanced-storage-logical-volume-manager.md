---
title: "Advanced Storage: Logical Volume Manager"
date: 2020-08-10
url: /advanced-storage-logical-volume-manager
toc: false
images:
tags:
  - RHEL
  - Storage
  - Advanced Storage
  - LVM
  - Logical Volume Manager
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


## Understanding LVM

The Logical Volume Manager was introduced to workaround some restrictions that come with standard partitions.
The most important restriction would be inflexibility, with LVM you can dynamically grow a partition even if the disk itself is running out of space.

In the LVM architecture we can distinguish several layers. The lowest layer contains the storage devices, these can be anything from regular disks to partions and logical units (LUNs) on a storage-area network (SAN). Storage devices need to be flagged as physical volumes so that it can be used in an LVM setup. In turn, the physical volume is added to a volume group, which is the abstraction of all available storage space. The volume group can be resized when needed by adding more space (or physical volumes) to the volume group.

On top of the volume group we have the logical volumes, they get their disk space from the volume group. This means a logical volume can consist of storage space coming from multiple physical volumes.

The actual file systems are created on the logical volumes. The file system must support resizing if the logical volumes are resized.


>When running out of disk space on a logical volume, we take available disk space from the volume group. If there is no available disk space on the volume group, we add a physical volume to the volume group.

{{< image src="/img/LVM.png" alt="LVM Architecture" position="center" >}}


The most important benefit for using LVM would be the added flexibility in managing storage, volumes are not bound to the restrictions of physical hard drives.

Another benefit would be the support for snapshots. A snapshot keeps the current state of a logical volume and it can be used to revert to a previous state. 

LVM snapshots are created by copying the logical volume metadata (describing the current state) to a snapshot volume. As long as nothing changes, the original blocks on the volume are addressed. When blocks are modified, the blocks containing the previous state of file are copied to the snapshot volume.

A third advantage to using LVM would be the option to replace failing hardware easily. If a disk is failing, data can be moved within the volume group, the failing disk can be removed from the volume group and a new disk can be added. This without any downtime for the logical volume itself.


## Creating Logical Volumes

In order to create logical volumes, we need to create the underlying layers in the LVM architecture: First we convert the physical devices into physical volumes, then we create the volume group and assign physical volumes to it, lastly we create the logical volume.

### Creating Physical Volumes

To create a physical volume, we create a partition and mark it with the LVM partition type. For MBR disks that would be type `8e` and `8e00` for GUID disks. When using **parted** you need to use the `set n lvm on` command, where `n` is the partition number.

After creating the partition and flagging it as an LVM partition type, we use the **pvcreate** command to mark it as a physical volume. This writes metadata to the partition so a volume group can use it. 

In the below example, I'll use an unpartitioned disk (`sda`) to create a physical volume on.

```
[root@server1 ~]# lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda      8:0    0   10G  0 disk 
sr0     11:0    1 1024M  0 rom  
vda    253:0    0   20G  0 disk 
├─vda1 253:1    0    1G  0 part /boot
├─vda2 253:2    0    1G  0 part [SWAP]
└─vda3 253:3    0    8G  0 part /


[root@server1 ~]# gdisk /dev/sda
GPT fdisk (gdisk) version 1.0.3

Partition table scan:
  MBR: not present
  BSD: not present
  APM: not present
  GPT: not present

Creating new GPT entries.

Command (? for help): n
Partition number (1-128, default 1): 
First sector (34-20971486, default = 2048) or {+-}size{KMGTP}: 
Last sector (2048-20971486, default = 20971486) or {+-}size{KMGTP}: +2G
Current type is 'Linux filesystem'
Hex code or GUID (L to show codes, Enter = 8300): 8e00
Changed type of partition to 'Linux LVM'

Command (? for help): p
Disk /dev/sda: 20971520 sectors, 10.0 GiB
Model: QEMU HARDDISK   
Sector size (logical/physical): 512/512 bytes
Disk identifier (GUID): 7188B769-C4F4-46C6-8A81-B0E719E621EA
Partition table holds up to 128 entries
Main partition table begins at sector 2 and ends at sector 33
First usable sector is 34, last usable sector is 20971486
Partitions will be aligned on 2048-sector boundaries
Total free space is 16777149 sectors (8.0 GiB)

Number  Start (sector)    End (sector)  Size       Code  Name
   1            2048         4196351   2.0 GiB     8E00  Linux LVM

Command (? for help): w

Final checks complete. About to write GPT data. THIS WILL OVERWRITE EXISTING
PARTITIONS!!

Do you want to proceed? (Y/N): y
OK; writing new GUID partition table (GPT) to /dev/sda.
The operation has completed successfully.


[root@server1 ~]# pvcreate /dev/sda1
  Physical volume "/dev/sda1" successfully created.
```

We can see a summmary of the physical volumes by using the **pvs** command, or see more details by using the **pvdisplay** command:

```
[root@server1 ~]# pvs
  PV         VG Fmt  Attr PSize PFree
  /dev/sda1     lvm2 ---  2.00g 2.00g

[root@server1 ~]# pvdisplay
  "/dev/sda1" is a new physical volume of "2.00 GiB"
  --- NEW Physical volume ---
  PV Name               /dev/sda1
  VG Name               
  PV Size               2.00 GiB
  Allocatable           NO
  PE Size               0   
  Total PE              0
  Free PE               0
  Allocated PE          0
  PV UUID               0ata3q-CxXg-WFv6-p3GR-CWxc-wrG3-HxVM6N

```



### Creating Volume Groups
Now that we have a physical volume, we should assign it to a volume group.
In this case we'll create a new volume group, later on we'll discuss how to add a physical volume to an already existing volume group.

We need to issue the **vgcreate** command followed by the name of the volume group and the name of the physical device we want to add to it:

```
[root@server1 ~]# vgcreate vgdata /dev/sda1 
  Volume group "vgdata" successfully created
```

Check the volume group with the **vgs** and **vgdisplay** commands:

```
[root@server1 ~]# vgs
  VG     #PV #LV #SN Attr   VSize  VFree 
  vgdata   1   0   0 wz--n- <2.00g <2.00g

[root@server1 ~]# vgdisplay
  --- Volume group ---
  VG Name               vgdata
  System ID             
  Format                lvm2
  Metadata Areas        1
  Metadata Sequence No  1
  VG Access             read/write
  VG Status             resizable
  MAX LV                0
  Cur LV                0
  Open LV               0
  Max PV                0
  Cur PV                1
  Act PV                1
  VG Size               <2.00 GiB
  PE Size               4.00 MiB
  Total PE              511
  Alloc PE / Size       0 / 0   
  Free  PE / Size       511 / <2.00 GiB
  VG UUID               h50RrD-QmTD-yY3f-gDiy-TolW-GR1B-gFoaCe
  ```

> We could have created the physical and volume group in one step as long as the partition is marked as an LVM partition. When issuing the command **vgcreate vgdata /dev/sda1** without having created the physical volume, the **vgcreate** utility will automatically flag the partition as a physical volume.   This is useful for adding a complete disk device instead of a partition. A complete disk device does not need to be flagged for LVM use in a partion utility, e.g. **vgcreate vgbackup /dev/sdb**.

When working with LVM there is the *physical extent size* to consider. This is the size of the basic building blocks used in the LVM configuration. The default extent size is 4.00MiB:

```
[root@server1 ~]# vgdisplay | grep  'PE'
  PE Size               4.00 MiB
  Total PE              511
  Alloc PE / Size       0 / 0   
  Free  PE / Size       511 / <2.00 GiB
```

The PE Size is always specified as multiples of 2MiB with a maximum of 128MiB.
The **vgcreate -s** option allows you to specify the PE Size you want to use. If you need to create huge logical volumes it is more efficient to use a big PE Size.

Above we can see that the PE Size is 4.00MiB and we have a total PE of 511 blocks. 
511 multiplied by 4 would be 2044MiB. 




### Creating the Logical Volumes and File Systems

When creating the logical volume, we have to specify a logical volume name and size.
We specify the name use the **lvcreate -n** option, an absolute size with the **-L** option or a relative size using the **-l** option:
* **lvcreate -n mylvol1 -L 2G vgdata** - Creates a logical volume with the name `mylvol1` and an absolute size of 2GiB taken from the `vgdata` volume group.
* **lvcreate -n mylvol1 -l 100%FREE vgdata** - Creates a logical volume spanning all available space in the `vgdata` volume group.
* **lvcreate -n mylvol1 -l 50%FREE vgdata** - Creates a logical volume spanning 50% of the available space in the `vgdata` volume group.

```
[root@server1 ~]# lvcreate -n lvol1 -l 50%FREE vgdata
  Logical volume "lvol1" created.
[root@server1 ~]# lvcreate -n lvol2 -l 100%FREE vgdata
  Logical volume "lvol2" created.

[root@server1 ~]# lsblk
NAME             MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda                8:0    0   10G  0 disk 
└─sda1             8:1    0    2G  0 part 
  ├─vgdata-lvol1 252:0    0 1020M  0 lvm  
  └─vgdata-lvol2 252:1    0    1G  0 lvm  


[root@server1 ~]# lvs
  LV    VG     Attr       LSize    Pool Origin Data%  Meta%  Move Log Cpy%Sync Convert
  lvol1 vgdata -wi-a----- 1020.00m                                                    
  lvol2 vgdata -wi-a-----    1.00g    

[root@server1 ~]# vgs
  VG     #PV #LV #SN Attr   VSize  VFree
  vgdata   1   2   0 wz--n- <2.00g    0 

```

Notice how I created one logical volume consisting of half of the available space in the volume group first, then created a second one with the `-l 100%FREE` option to take all remaining available space.

At this point we're ready to create a file system on both logical volumes:
```
[root@server1 ~]# mkfs.xfs /dev/vgdata/lvol1
meta-data=/dev/vgdata/lvol1      isize=512    agcount=4, agsize=65280 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=1, sparse=1, rmapbt=0
         =                       reflink=1
data     =                       bsize=4096   blocks=261120, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=1566, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0

[root@server1 ~]# mkfs.xfs /dev/vgdata/lvol2
meta-data=/dev/vgdata/lvol2      isize=512    agcount=4, agsize=65536 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=1, sparse=1, rmapbt=0
         =                       reflink=1
data     =                       bsize=4096   blocks=262144, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=2560, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
```


### Understanding Device Naming

Logical volumes can be addressed in different ways:
* `/dev/[volume group]/[logical volume]` e.g. `/dev/vgdata/lvol1`
* `/dev/mapper/[volumge group]-[logical volume]` e.g. `/dev/mapper/vgdata-lvol1`

The first method is basically a symbolic link to the device mapper (abbreviate as `dm`), which in turn is a generic interface the Linux kernel uses to address storage devices. Device mapper devices are generated on detection and use meaningless names like `/dev/dm-0` and `/dev/dm-1`:

```
[root@server1 ~]# ls -l /dev/vgdata/
total 0
lrwxrwxrwx. 1 root root 7 Aug 14 00:10 lvol1 -> ../dm-0
lrwxrwxrwx. 1 root root 7 Aug 14 00:10 lvol2 -> ../dm-1
```

To provide easier access there are symbolic links to those same device mapper devices in `/dev/mapper`:
```
[root@server1 ~]# ls -l /dev/mapper/
total 0
crw-------. 1 root root 10, 236 Aug 14 00:10 control
lrwxrwxrwx. 1 root root       7 Aug 14 00:10 vgdata-lvol1 -> ../dm-0
lrwxrwxrwx. 1 root root       7 Aug 14 00:10 vgdata-lvol2 -> ../dm-1
```

When working with LVM logical volumes, you can use either of these device names.


### Essential Commands for LVM Management
{{<table "table table-dark table-striped table-bordered">}}
Command | Description
-------|------
pvcreate | Creates physical volumes
pvs | Summary of available physical volumes
pvdisplay | List physical volumes and their properties
pvremove | Removes the physical volume signature from a block device
vgcreate | Creates a volume group
vgs | Summary of available volume groups
vgdisplay | List volume groups and their properties
vgremove | Removes a volume group
lvcreate | Creates logical volumes
lvs | Shows a summary of all available logical volumes
lvdisplay | List available logical volumes and their properties
lvremove | Removes a logical volumes
{{</table>}}


## Resizing LVM Logical Volumes

The ability to resize logical volumes is one of the major benefits of using LVM. 

>When using the XFS file system, a volume can be increased in size, but *not* decreased.  Ext4 supports decreasing the file system size, but it must be done when the file system is offline. In other words, you must unmount it before you can resize it. To increase the size of a logical volume, we need to have disk space available in the volume group, so we need to address that first.


### Resizing Volume Groups

The **vgextend** command is used to add storage to a volume group, while the **vgreduce** command is used to take physical volumes out of a volume group:
* Make sure a physical volume or device is available to be added to a volume group
* Use the **vgextend** command to extend the volume group with the space from the new physical volume or device.
* Use the **vgs** or **vgdisplay** commands to verify that a physical volume has been added to the volume group. The number of physical volumes for a specific volume group are indicated in the `#PV` column.

### Resizing Logical Volumes and File Systems

Logical volumes can be extended using the **lvextend** or **lvresize** commands and it can automatically take care of extending the file system on top using the **-r** option.

Similarly to creating logical volumes, you can extend the logical volume size with the `-L` or `-l` options (absolute or relative sizes). If you specify an absolute size,  the `-L` option must be followed by a **+** sign and the amount of disk space you want to add, e.g. `lvextend -L +1G -r /dev/vgdata/lvol1`.

Relative sizes can be specified like so:
* `lvextend -r -l 75%VG /dev/vgdata/lvol1` - This resizes the logical volume so that it takes *75% of the **total** disk space* in the volume group.  

* `lvresize -r -l +75%VG /dev/vgdata/lvol1` - This ***adds** 75% of the total size* of the volume group to the logical volume.  

* `lvextend -r -l +75%FREE /dev/vgdata/lvol1` - ***Add*** 75% of all ***free*** disk space to the logical volume.

* `lvresize -r -l 75%FREE /dev/vgdata/lvol1` - This resizes the logical volume so that it takes *75% of the **free** disk space* in the volume group.  


Let's check the current block devices:

```
[root@server1 ~]# lsblk
NAME             MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda                8:0    0   10G  0 disk 
└─sda1             8:1    0    2G  0 part 
  ├─vgdata-lvol1 252:0    0 1020M  0 lvm  
  └─vgdata-lvol2 252:1    0    1G  0 lvm  
sr0               11:0    1 1024M  0 rom  
vda              253:0    0   20G  0 disk 
├─vda1           253:1    0    1G  0 part /boot
├─vda2           253:2    0    1G  0 part [SWAP]
└─vda3           253:3    0    8G  0 part /
```

We create a new partition and mark it as a physical volume:
```
[root@server1 ~]# gdisk /dev/sda
GPT fdisk (gdisk) version 1.0.3

Partition table scan:
  MBR: protective
  BSD: not present
  APM: not present
  GPT: present

Found valid GPT with protective MBR; using GPT.

Command (? for help): p
Disk /dev/sda: 20971520 sectors, 10.0 GiB
Model: QEMU HARDDISK   
Sector size (logical/physical): 512/512 bytes
Disk identifier (GUID): 7188B769-C4F4-46C6-8A81-B0E719E621EA
Partition table holds up to 128 entries
Main partition table begins at sector 2 and ends at sector 33
First usable sector is 34, last usable sector is 20971486
Partitions will be aligned on 2048-sector boundaries
Total free space is 16777149 sectors (8.0 GiB)

Number  Start (sector)    End (sector)  Size       Code  Name
   1            2048         4196351   2.0 GiB     8E00  Linux LVM

Command (? for help): n
Partition number (2-128, default 2): 
First sector (34-20971486, default = 4196352) or {+-}size{KMGTP}: 
Last sector (4196352-20971486, default = 20971486) or {+-}size{KMGTP}: +3G
Current type is 'Linux filesystem'
Hex code or GUID (L to show codes, Enter = 8300): 8e00
Changed type of partition to 'Linux LVM'

Command (? for help): p
Disk /dev/sda: 20971520 sectors, 10.0 GiB
Model: QEMU HARDDISK   
Sector size (logical/physical): 512/512 bytes
Disk identifier (GUID): 7188B769-C4F4-46C6-8A81-B0E719E621EA
Partition table holds up to 128 entries
Main partition table begins at sector 2 and ends at sector 33
First usable sector is 34, last usable sector is 20971486
Partitions will be aligned on 2048-sector boundaries
Total free space is 10485693 sectors (5.0 GiB)

Number  Start (sector)    End (sector)  Size       Code  Name
   1            2048         4196351   2.0 GiB     8E00  Linux LVM
   2         4196352        10487807   3.0 GiB     8E00  Linux LVM

Command (? for help): w

Final checks complete. About to write GPT data. THIS WILL OVERWRITE EXISTING
PARTITIONS!!

Do you want to proceed? (Y/N): y
OK; writing new GUID partition table (GPT) to /dev/sda.
Warning: The kernel is still using the old partition table.
The new table will be used at the next reboot or after you
run partprobe(8) or kpartx(8)
The operation has completed successfully.

[root@server1 ~]# partprobe
```

Check the output of `lsblk` for the new partition:
```
[root@server1 ~]# lsblk
NAME             MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda                8:0    0   10G  0 disk 
├─sda1             8:1    0    2G  0 part 
│ ├─vgdata-lvol1 252:0    0 1020M  0 lvm  
│ └─vgdata-lvol2 252:1    0    1G  0 lvm  
└─sda2             8:2    0    3G  0 part 
sr0               11:0    1 1024M  0 rom  
vda              253:0    0   20G  0 disk 
├─vda1           253:1    0    1G  0 part /boot
├─vda2           253:2    0    1G  0 part [SWAP]
└─vda3           253:3    0    8G  0 part /
```


Check the output of `vgs`, extend the volume group and check the changes:
```
[root@server1 ~]# vgs
  VG     #PV #LV #SN Attr   VSize  VFree
  vgdata   1   2   0 wz--n- <2.00g    0 

[root@server1 ~]# vgextend vgdata /dev/sda2
  Physical volume "/dev/sda2" successfully created.
  Volume group "vgdata" successfully extended

[root@server1 ~]# vgs
  VG     #PV #LV #SN Attr   VSize VFree 
  vgdata   2   2   0 wz--n- 4.99g <3.00g
```

Extend the logical volume with all available disk space (3GiB) from the volume group:
```
[root@server1 ~]# lvresize -r -l +100%FREE /dev/vgdata/lvol1
Phase 1 - find and verify superblock...
Phase 2 - using internal log
        - zero log...
        - scan filesystem freespace and inode maps...
        - found root inode chunk
Phase 3 - for each AG...
        - scan (but don't clear) agi unlinked lists...
        - process known inodes and perform inode discovery...
        - agno = 0
        - agno = 1
        - agno = 2
        - agno = 3
        - agno = 4
        - agno = 5
        - agno = 6
        - agno = 7
        - agno = 8
        - agno = 9
        - agno = 10
        - agno = 11
        - agno = 12
        - process newly discovered inodes...
Phase 4 - check for duplicate blocks...
        - setting up duplicate extent list...
        - check for inodes claiming duplicate blocks...
        - agno = 0
        - agno = 1
        - agno = 2
        - agno = 3
        - agno = 4
        - agno = 5
        - agno = 6
        - agno = 7
        - agno = 8
        - agno = 9
        - agno = 10
        - agno = 11
        - agno = 12
No modify flag set, skipping phase 5
Phase 6 - check inode connectivity...
        - traversing filesystem ...
        - traversal finished ...
        - moving disconnected inodes to lost+found ...
Phase 7 - verify link counts...
No modify flag set, skipping filesystem flush and exiting.
  Size of logical volume vgdata/lvol1 changed from <3.00 GiB (767 extents) to 3.99 GiB (1022 extents).
  Logical volume vgdata/lvol1 successfully resized.
meta-data=/dev/mapper/vgdata-lvol1 isize=512    agcount=13, agsize=65280 blks
         =                       sectsz=512   attr=2, projid32bit=1
         =                       crc=1        finobt=1, sparse=1, rmapbt=0
         =                       reflink=1
data     =                       bsize=4096   blocks=785408, imaxpct=25
         =                       sunit=0      swidth=0 blks
naming   =version 2              bsize=4096   ascii-ci=0, ftype=1
log      =internal log           bsize=4096   blocks=1566, version=2
         =                       sectsz=512   sunit=0 blks, lazy-count=1
realtime =none                   extsz=4096   blocks=0, rtextents=0
data blocks changed from 785408 to 1046528
```
Notice that I was using the XFS file system and that the `lvresize -r` option resized the file system as well. 


Verify the changes in `lbsblk`:
```
[root@server1 ~]# lsblk
NAME             MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
sda                8:0    0   10G  0 disk 
├─sda1             8:1    0    2G  0 part 
│ ├─vgdata-lvol1 252:0    0    4G  0 lvm  
│ └─vgdata-lvol2 252:1    0    1G  0 lvm  
└─sda2             8:2    0    3G  0 part 
  └─vgdata-lvol1 252:0    0    4G  0 lvm  
sr0               11:0    1 1024M  0 rom  
vda              253:0    0   20G  0 disk 
├─vda1           253:1    0    1G  0 part /boot
├─vda2           253:2    0    1G  0 part [SWAP]
└─vda3           253:3    0    8G  0 part /
```

