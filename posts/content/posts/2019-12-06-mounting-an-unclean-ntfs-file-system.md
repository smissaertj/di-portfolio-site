---
title: Mounting an unclean NTFS file system
author: Joeri
date: 2019-12-06T11:22:00+00:00
url: /mounting-an-unclean-ntfs-file-system/
swp_cache_timestamp:
  - 442844
categories:
  - Linux
  - Red Hat Enterprise Linux
tags:
  - mount
  - ntfs
  - unclean
  - RHEL
  - Red Hat

---

{{< image src="/img/ntfs-image.png" alt="NTFS" position="center">}}

<div class="wp-block-image">
  <figure class="aligncenter size-large"><img src="https://joerismissaert.dev/wp-content/uploads/2019/12/ntfs-image.png" alt="" class="wp-image-265" /></figure>
</div>

I'm dual booting between RHEL 8 and Windows 10 and the NTFS drive I use to share data between my two operating systems was suddenly mounted Read Only on Linux.

While trying to mount the drive again, I was facing the following message:

```
[root@rhel8 mnt]# umount -l /dev/sda1
[root@rhel8 mnt]# mount -t ntfs-3g -o rw /dev/sda1 /mnt/data
The disk contains an unclean file system (0, 0).
Metadata kept in Windows cache, refused to mount.
Falling back to read-only mount because the NTFS partition is in an
unsafe state. Please resume and shutdown Windows fully (no hibernation
or fast restarting.)
```

I don't use hibernation in Windows and fast restarting is definitely turned off. I didn't put Windows to sleep either, so I'm not sure where this is coming from at this point, but since I needed to write to the disk I needed an immediate fix without rebooting.

To fix the issue, I need the `ntfsfix` application:

```
[root@rhel8 ~]# dnf whatprovides ntfsfix
Updating Subscription Management repositories.
ntfsprogs-2:2017.3.23-11.el8.x86_64 : NTFS filesystem libraries and utilities
Repo        : epel
Matched from:
Filename    : /usr/bin/ntfsfix

[root@rhel8 ~]# dnf install -y ntfsprogs
```

Then I ran `ntfsfix` against `/dev/sda1`:

```
[root@rhel8 ~]# ntfsfix /dev/sda1
Mounting volume... The disk contains an unclean file system (0, 0).
Metadata kept in Windows cache, refused to mount.
FAILED
Attempting to correct errors... 
Processing $MFT and $MFTMirr...
Reading $MFT... OK
Reading $MFTMirr... OK
Comparing $MFTMirr to $MFT... OK
Processing of $MFT and $MFTMirr completed successfully.
Setting required flags on partition... OK
Going to empty the journal ($LogFile)... OK
Checking the alternate boot sector... OK
NTFS volume version is 3.1.
NTFS partition /dev/sda1 was processed successfully.
```

That's it, the system then mounted the disk according to the options I've specified in `/etc/fstab` and I can now write again to my NTFS disk.