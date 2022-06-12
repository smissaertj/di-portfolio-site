---
title: "Configuring and Auto Mounting Remote File Systems Using fstab and automount: NFS & CIFS"
date: 2021-01-10
url: /configuring-and-auto-mounting-remote-file-systems-using-fstab-and-automount-NFS-CIFS
toc: false
draft: false
images:
tags:
  - RHEL
  - Network
  - Storage
  - Network Storage
  - NFS
  - CIFS
  - Samba
---

{{< figure class="center" src="/img/redhat-8-logo.png" alt="Red Hat logo">}}


# Using NFS Services

The Network File System is a protocol that was developed for UNIX by Sun in the early 1980s. Its purpose is to make mounting of remote file systems in the local file system hierarchy possible. It was often used with Network Information Services (NIS) which provides network-based authentication, all machines connected to the NIS server used the same user accounts and security was handled by the NIS server. NFS security by default is limited to allowing and restricting specific hosts. 

Without NIS, NFS seems to be an unsecure solution: if on server1 the user X has UID 1001 and on server2 user Y has UID 1001, then user X would have the same access to server2 resources as user Y. To prevent situations like this, NFS should be used together with a centralized authentication service like the Lightweight Directory Access Protocol (LDAP) and Kerberos. This solution is not covered in this article. 

On RHEL8, NFSv4 is the default version of NFS wich you can override when mounting using the `nfsvers=` mount option. Typically, clients will automatically fallback to a previous version of NFS if required.


## Offering an NFS Share

To setup an NFS share you would need to go through a few tasks:
* Create local directories which you want to share and copy some data into them:
```
[root@server2 ~]# mkdir -p /nfs_data /nfs_users/user{1..2}
[root@server2 ~]# cp -r /etc/[a-c]* /nfs_data/
[root@server2 ~]# cp -r /etc/[d-f]* /nfs_users/user1/
[root@server2 ~]# cp -r /etc/[g-i]* /nfs_users/user2/
```

* Edit the `/etc/exports` file to define the NFS shares:
```
[root@server2 ~]# cat /etc/exports
/nfs_data	*(rw,no_root_squash)
/nfs_users		*(rw,no_root_squash)
```

* Start and enable the NFS server:
```
[root@server2 ~]# yum install nfs-utils
[root@server2 ~]# systemctl enable --now nfs-server
```

* Configure the firewall to allow incoming NFS traffic

```
[root@server2 ~]# firewall-cmd --add-service=nfs --permanent
success
[root@server2 ~]# firewall-cmd --add-service=rpc-bind --permanent
success
[root@server2 ~]# firewall-cmd --add-service=mountd --permanent
success
[root@server2 ~]# firewall-cmd --reload
success
```

## Mounting the NFS Share

In order to mount an NFS share we need to know the name of the share. Typically this information is known by the administrator, but you have multiple options to discover what shares are available:
* If NFSv4 is used on the server, you can use a root mount. You mount the root directory of the NFS server and you'll see all shares you have access to under your local mount point. 
* Use the `showmount -e` command

> The `showmount` command may have issues with NFSv4 servers that are behind a firewall. The command relies on the portmapper service which uses random UDP ports while the firwall nfs service opens port 2049 only, which doesn't allow portmapper traffic. In these cases you can use the root mount option to discover the shares.

```
[root@server1 ~]# showmount -e server2
Export list for server2:
/nfs_data   *
/nfs_users *
```

```
[root@server1 ~]# mount server2:/ /mnt
[root@server1 ~]# ls /mnt/
nfs_data  nfs_users
```

# Using CIFS Services

Microsoft published the technical specifications of its Server Message Block (SMB) protocol. This protocol is the foundation of all shares that are created in a Windows environment.
Releasing these specifications led to the start of the Samba project. The goal of this project was to provide SMB services on top of other operating systems. Samba has developed into the standard for file sharing between different operating systems and is now often referred to as the Common Internet File System (CIFS).

## Setting Up a Samba Server

Before jumping into configuring the samba server, let's clearly define our goals.
Server2, the samba server, should be sharing the following directories:
* `/var/samba/public_read_share` - read only access for guests, mounted on `/mnt/public_read_share`
* `/var/samba/public_write_share` - read/write permissions for guests, mounted on `/mnt/public_write_share`
* `/var/samba/student_share` - read permissions for guests, read/write permissions for users in the `students` group. Mounted on `/mnt/students_share`.

### Installing and Configuring Samba

Install the samba package and create the shared directories:
```
[root@server2 ~]# yum install samba -y
...
[root@server2 ~]# mkdir -p /var/samba/{public_share,public_write_share,students_share}
[root@server2 ~]# ls /var/samba/
public_share  public_write_share  students_share
```

We enable the `smbd_anon_write` SELinux Boolean which allows anonymous users to modify public files labeled with the `public_content_rw_t` file context.
Next, we set the appropriate SELinux file contexts:
* `public_content_t` - Allows Read Only access to public files.
* `public_content_rw_t` - Allows Read/Write access to public files.
* `samba_share_t` - As samba doesn't have default paths for shares, we make sure SELinux recognizes our share as a standard samba share.


```
[root@server2 samba]# pwd
/var/samba

[root@server2 samba]# ls -lh
total 0
drwxr-xr-x. 2 root root 6 Mar 11 13:24 public_share
drwxr-xr-x. 2 root root 6 Mar 11 13:24 public_write_share
drwxr-xr-x. 2 root root 6 Mar 11 13:24 students_share

[root@server2 samba]# setsebool -P smbd_anon_write on
[root@server2 samba]# getsebool smbd_anon_write 
smbd_anon_write --> on

[root@server2 samba]# semanage fcontext -a -t public_content_t "/var/samba/public_share(/.*)?"
[root@server2 samba]# semanage fcontext -a -t public_content_rw_t "/var/samba/public_write_share(/.*)?"
[root@server2 samba]# semanage fcontext -a -t samba_share_t "/var/samba/students_share(/.*)?"
[root@server2 samba]# restorecon -Rv /var/samba/
Relabeled /var/samba/public_share from unconfined_u:object_r:var_t:s0 to unconfined_u:object_r:public_content_t:s0
Relabeled /var/samba/public_write_share from unconfined_u:object_r:var_t:s0 to unconfined_u:object_r:public_content_rw_t:s0
Relabeled /var/samba/students_share from unconfined_u:object_r:var_t:s0 to unconfined_u:object_r:samba_share_t:s0

[root@server2 samba]# ls -lhZ
total 0
drwxr-xr-x. 2 root root unconfined_u:object_r:public_content_t:s0    6 Mar 11 13:24 public_share
drwxr-xr-x. 2 root root unconfined_u:object_r:public_content_rw_t:s0 6 Mar 11 13:24 public_write_share
drwxr-xr-x. 2 root root unconfined_u:object_r:samba_share_t:s0       6 Mar 11 13:24 students_share
```

Create the `students` group and, add the user `student` to the group.
Create the `smb_user` through which we'll be able to write to the `public_write_share` directory.
Add the Linux user `student` to samba and set a password. This credential will be used to authenticate and mount the `students_share` directory.
Set the Linux permissions on the shared directories:
```
[root@server2 samba]# groupadd students
[root@server2 samba]# usermod -aG students student
[root@server2 samba]# id student
uid=1000(student) gid=1000(student) groups=1000(student),1001(students)

[root@server2 samba]# useradd smb_user --no-create-home --shell /sbin/nologin
[root@server2 samba]# 

[root@server2 samba]# smbpasswd -a student
New SMB password:
Retype new SMB password:
Added user student.

[root@server2 samba]# chgrp smb_user public_write_share
[root@server2 samba]# chmod 0770 public_write_share
[root@server2 samba]# chmod g+s public_write_share
[root@server2 samba]# 

[root@server2 samba]# chgrp students students_share
[root@server2 samba]# chmod 0775 students_share
[root@server2 samba]# chmod g+s students_share
[root@server2 samba]# 

[root@server2 samba]# ls -lhZ
total 0
drwxr-xr-x. 2 root root     unconfined_u:object_r:public_content_t:s0    6 Mar 11 13:24 public_share
drwxrws---. 2 root smb_user unconfined_u:object_r:public_content_rw_t:s0 6 Mar 11 13:24 public_write_share
drwxrwsr-x. 2 root students unconfined_u:object_r:samba_share_t:s0       6 Mar 11 13:24 students_share
```
Note that we don't change any permissions on `public_share`, since we only need read access.

Next, we configure the samba shares in `/etc/samba/smb.conf`:
```
[root@server2 samba]# cd /etc/samba
[root@server2 samba]# mv smb.conf smb.conf.old
[root@server2 samba]# vim smb.conf
...

[root@server2 samba]# testparm
Load smb config files from /etc/samba/smb.conf
Loaded services file OK.
Server role: ROLE_STANDALONE

Press enter to see a dump of your service definitions

# Global parameters
[global]
	security = USER
	workgroup = SAMBA
	idmap config * : backend = tdb


[public_read]
	comment = Public Read Only Share
	guest ok = Yes
	path = /var/samba/public_share


[public_write]
	comment = Public Read/Write Share
	force user = smb_user
	guest ok = Yes
	path = /var/samba/public_write_share
	read only = No
	write list = smb_user


[students]
	comment = Read/Write access for the students group. Read access for anyone else.
	guest ok = Yes
	path = /var/samba/students_share
	write list = +students
```

We need to allow samba traffic through our firewall:
```
[root@server2 samba]# firewall-cmd --add-service=samba --permanent
success
[root@server2 samba]# firewall-cmd --reload
success
```

The final step before moving on to the client side would be to start and enable the samba service:
```
[root@server2 samba]# systemctl enable --now smb
Created symlink /etc/systemd/system/multi-user.target.wants/smb.service → /usr/lib/systemd/system/smb.service.
```


## Discovering CIFS Shares
On `server1`, where the shares are going to be mounted, you discover available shares using the `smbclient -L //hostname` command. 
Make sure you have the `cifs-utils` and `samba-client` packages installed:

```
[root@server1 ~]# yum install -y cifs-utils samba-client
...
```

Let's discover the shares we created on `server2`. When you're prompted for a password, just hit Enter without providing a password.
```
[root@server1 ~]# smbclient -L //server2
Enter SAMBA\root's password: 
Anonymous login successful

	Sharename       Type      Comment
	---------       ----      -------
	public_read     Disk      Public Read Only Share
	public_write    Disk      Public Read/Write Share
	students        Disk      Read/Write access for the students group. Read access for anyone else.
	IPC$            IPC       IPC Service (Samba 4.12.3)
SMB1 disabled -- no workgroup available
[root@server1 ~]#
```

We're ready to move to the next step and mount our shares.


## Mounting and Authenticating to Samba Shares
In the previous steps we created two guest shares and one share that needs authentication. 
We can mount these as follows:  

* `mount -t cifs -o guest //server2/public_read /mnt/public_read_share`  
* `mount -t cifs -o guest //server2/public_write /mnt/public_write_share`  
* `mount -t cifs -o username=student,password=password //server2/students_share /mnt/students_share`  

Before you do so, create the local mount points:
```
[root@server1 ~]# mkdir /mnt/{public_read_share,public_write_share,students_share}
[root@server1 ~]# ls -l /mnt/
total 0
drwxr-xr-x. 2 root root 6 Mar 11 14:41 public_read_share
drwxr-xr-x. 2 root root 6 Mar 11 14:41 public_write_share
drwxr-xr-x. 2 root root 6 Mar 11 14:41 students_share

[root@server1 ~]# mount -t cifs -o guest //server2/public_read /mnt/public_read_share
[root@server1 ~]# mount -t cifs -o guest //server2/public_write /mnt/public_write_share
[root@server1 ~]# mount -t cifs -o username=student,password=password //server2/students /mnt/students_share
```

Next, test the read/write access to the shares. The outcome should be as expected.

> Note that we've mounted the share as `root`, this means the `/mnt/students_share` directory will only be writeable for the user `root`. In the next step we'll cover how to auto mount the share at boot time.


## Mounting Remote File Systems Through fstab
As we've seen in [an earlier post](/managing-storage-creating-mounting-file-systems), the `/etc/fstab` file can be used to mount file systems automatically at boot time. 


### Mounting NFS Shares Through fstab
Mounting NFS Shares through `/etc/fstab` is pretty straightforward. Add the following line to the `fstab` file:
```
server2:/nfs_data	/nfs_data	nfs  sync 	0 0
```

With the `sync` option we ensure that modified files are committed to the remote file system immediately instead of being placed in a write buffer.



### Mounting Samba Shares Through fstab
When mounting Samba file systems through `/etc/fstab`, you need to consider a specific challenge: The user credentials that are needed to issue the mount. 
These are typically specified as mount options using `username=` and `password=`, but it is not a good idea to put these in clear text in the `/etc/fstab` file.

We can work around this by creating a file in the `root` home that contains these credentials, and referencing `/etc/fstab` to that file:
```
[root@server1 ~]# pwd
/root
[root@server1 ~]# cat cifs.txt 
user=student
pass=password
[root@server1 ~]#
```

We set strict permissions on the file so only `root` can read it:
```
[root@server1 ~]# chmod 0600 cifs.txt
[root@server1 ~]#
```

Next, for the `//server2/students` share, we add the following line to `/etc/fstab`:
```
//server2/students	/mnt/students_share	cifs	credentials=/root/cifs.txt,gid=students,file_mode=0664,dir_mode=0775 0 0
```

Let's break down what the line does exactly:
* `//server2/students` - The remote file system we're mounting.
* `/mnt_students_share` - The local mount point of the share.
* `cifs` - The remote file system type.
* `credentials=/root/cifs.txt` - Specifies the file that contains the credentials necessary to mount the remote file system.
* `gid=students` - We set group ownership on the files and directories to the group `students` .
* `file_mode=0664` - We set the necessary file permissions: read+write for Owner and Group, read for Others.
* `dir_mode=0775` -  We set the necessary directory permissions: read+write+execute for Owner and Group, read+execute for Others.
* `0 0` - We don't need backup support through the `dump` utility and we don't want `fsck` to check the disk integrity during boot.


Simarly to the above, the entry for the `//server2/public_write_share` would look like this:
```
//server2/public_write_share	/mnt/public_write_share cifs	guest,file_mode=0777,dir_mode=0777	0 0
```
We autenticate as the user `guest` aganst the remote file system and we allow everyone read+write access to files and, read+write+execute permissions to directories.


For the last share, `//server2/public_share`, we don't specify Linux permissions in the `/etc/fstab` file as this share has been set to read-only by default on the Samba server. 
```
//server2/public_share	/mnt/public_read_share	cifs	guest	0 0
```

Here all three `/etc/fstab` entries:
```
//server2/public_share	/mnt/public_read_share	cifs	guest	0 0
//server2/public_write_share	/mnt/public_write_share cifs	guest,file_mode=0666,dir_mode=0777	0 0
//server2/students	/mnt/students_share	cifs	credentials=/root/cifs.txt,gid=students,file_mode=0664,dir_mode=0775 0 0
```


## Using Automount to Mount Remote File Systems

As an alternative to using `/etc/fstab` we can configure `automount` to mount the shares automatically. The difference is that mounts through `automount` are "on demand", which ensures that no files systems are mounted when it's not needed. This works completely in user space and no root permissions are required, contrary to mounts using the `mount` command.

You need to install the `autofs` package to use `automount`:
```
[root@server1 ~]# yum install -y autofs
...
[root@server1 ~]# systemctl enable --now autofs
...
```

### Defining Mounts in Automount
Mounts in `automount` are defined through a two-step procedure:
* Edit the master configuration file in `/etc/auto.master` where you specify the local mount point and the secondary configuration file.
* Edit the secondary configuration file where you specify the subdirectory that will be created in the mount point.


For this exercise, we'll be using the `nfs_data` NFS share on `server2`:
```
[root@server2 ~]# cat /etc/exports
/nfs_users	*(rw,no_root_squash)
/nfs_data	*(rw,no_root_squash)
```

On `server1`, open the `/etc/auto.master` file and add the below line:  
```
/nfs_data	/etc/auto.nfs_data
```


On `server1`, open the `/etc/auto.nfs_data` file and add the below line:  
```
files -rw server2:/nfs_data
```

Restart the `autofs` service:
```
[root@server1 /]# systemctl restart autofs
```

Go to the `/nfs_data` directory on `server1`, notice there is **no** `files` directory:
```
[root@server1 nfs_data]# ls
[root@server1 nfs_data]#
```

Change directory to `/nfs_data/files`:
```
[root@server1 nfs_data]# cd files
[root@server1 files]# ls
automount_test
```

The `/nfs_data` share on `server2` was auto mounted on `/nfs_data/files` on `server1`.

### Using Wildcards in Automount
In some cases we're better off using dynamic directory names, for example when mounting home directories. The home directory of a user would be automatically mounted when that user logs in.  

We'll be simulating this by using the `/nfs_users` NFS share on `server2`:
```
[root@server2 ~]# cat /etc/exports
/nfs_users	*(rw,no_root_squash)
/nfs_data	*(rw,no_root_squash)
```

First, unmount the `/nfs_users` mount point on `server1`, if you still have it mounted, and delete the directory:
```
[root@server1 /]# umount /nfs_users 
[root@server1 /]# rm -rf nfs_users
```

Add the below line to the `/etc/auto.master` file on `server1`:
```
/nfs_users      /etc/auto.nfs_users
```

Create the `/etc/auto.nfs_users` file and add the below:
```
* -rw server2:/nfs_users/&`
```

Restart the `autofs` service:
```
[root@server1 /]# systemctl restart autofs
```

Go to the `/nfs_users` directory and notice it's empty:
```
[root@server1 /]# cd /nfs_users
[root@server1 nfs_users]# ls
[root@server1 nfs_users]#
```

Change directory to `/nfs_users/user1`:
```
[root@server1 nfs_users]# cd user1
[root@server1 user1]# ls
user1_automount_test
[root@server1 user1]#
```

See how the other user folders are auto-mounted on demand:
```
[root@server1 nfs_users]# ls
user1
[root@server1 nfs_users]# cd user2
[root@server1 user2]# ls
user2_automount_test
[root@server1 user2]# cd ..
[root@server1 nfs_users]# ls
user1  user2
```

