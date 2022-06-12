---
title: 'Basic & Advanced Permissions 101'
author: Joeri
date: 2020-05-09T12:23:40+00:00
url: /basic-advanced-permissions-101/
categories:
  - CentOS
  - Linux
  - Red Hat Enterprise Linux
tags:
  - Linux
  - permissions
  - RHEL
  - Red Hat
  - RHCSA

---

{{< image src="/img/Tux.png" alt="Tux" position="center" style="width: 100px;">}}

To get access to files on Linux, permissions are used. These permissions are assigned to three entities: the file owner, the group owner, and the others entity. 

## Managing File Ownership

### Displaying Ownership

Every file and directory on Linux has two owners: a user owner and a group owner. There is also the "others" entity. The _user_ , _group_ and _others_ are shown when listing permissions with the `ls -l` command. The below `test` file has read/write permissions for the user owner and group owner and read permissions for anyone else.

```
$ ls -l
# -rw-rw-r--. 1 joeri joeri 0 May  9 14:29 test
```

File ownership is checked in a specific order. The shell checks:

  1. if you are the user owner. If you are, the shells stops checking here.
  2. if you have obtained permissions through user-assigned Access Control Lists (more on that in a next post). 
  3. if you are a member of the group owner.
  4. if you have obtained permissions through a group ACL.
  5. if you're not the user owner nor a member of the group owner and haven't obtained any permissions through ACLs, you get the permissions of the _others_ entity.

You can quickly find files owned by a specific user or group using the `find` command, e.g. `find / -user joeri` or `find / -group users`

### Changing User Ownership

`chown who what` will change file or directory ownership, e.g. `chown joeri myfile` will set the user _joeri_ as the owner of _testfile._  
  
A particular useful option is the `-R` flag which allows you to change ownership recursively on a directory and everything below:  
`chown -R joeri /home/joeri`

### Changing Group Ownership

There are two commands to change group ownership: `chown` and `chgrp`

`chgrp users /home/account` will set the group owner to _users_ on the _/home/account_ directory. You can use the `-R` option as well.

With the `chown` command there are several ways to change the group owner:

  * `chown joeri.users myfile`  
    Sets the user _joeri_ as user owner and the group _users_ as the group owner.
  * `chown joeri:users myfile`
  * `chown .users myfile`
  * `chown :users myfile`

Again, the `-R` option is available.

### Default Ownership

The user who creates a file automatically becomes the user owner, and the primary group of that user automatically becomes group owner.  
If a user is a member of more groups, the effective primary group can be changed temporarily with the `newgrp` command so that new files will get a new group as group owner.

Check the effective primary group with the `groups` command. The primary group is the first group: _joeri_

```
$ groups joeri
joeri: joeri users
```

Change the effective primary group using the `newgrp` command, and undo the group change using `exit`.

```
$ newgrp users
$ groups joeri
joeri: users joeri
$ touch file1
-rw-rw-r--. 1 joeri users 0 May 9 14:29 file1
$ exit
$ groups joeri
joeri: joeri users
```

## Managing Basic Permissions

### Understanding Read, Write and Execute Permissions

The three basic permissions allow users to read, write and execute files. The effect of these permissions differ when applied to files or directories.


{{<table "table table-dark table-striped table-bordered">}}
Permission | Applied to Files | Applied to Directories
-----|----|-----
Read  | Open a file | List content
Write     | Change content | Create and delete files
Execute    | Run a program | Change into directory
{{</table>}}


#### Applying Basic Permissions

You use the `chmod` command to apply permissions. These can be set for user, group and others in either absolute/numeric or relative mode:

{{<table "table table-dark table-striped table-bordered">}}
Permission | Absolute | Relative
-----|----|-----
Read  | 4 | R
Write     | 2 | W
Execute    | 1 | X
{{</table>}}


When setting absolute permissions, you calculate the value you need. For example, setting Read+Write+Execute (4+2+1) permissions for the owner and Read+Execute (4+1) permissions for the group owner and others you would use: `chown 755 somefile`

Changing permissions in absolute mode will replace all current permissions. If instead you want to modify permission relative to the current ones you work with three indicators: **u**, **g**, **o** for User, Group and Others.  
`chmod u+rwx, g-w, o-rwx somefile` would set all permissions for the user owner, remove the write permission for the group owner and remove all permissions for others. 

To set execute permissions recursively to all directories but _not_ to files, you can use the uppercase X: `chown -R o+rX /somedirectory`

## Managing Advanced Permissions

Understanding Advanced Permissions

There are three advanced permissions: SUID (set user id), SGID (set group id) and Sticky Bit.

Applying the SUID permission to a file will allow a user to execute that file as if he had the user owner rights on the file. A file that has root as user ower and has the SUID permission will be executed as _root_ by the user even if that user isn't root at all. An example is the `passwd` command:

```
$ ls -l /usr/bin/passwd<br />-rwsr-xr-x. 1 root root 37600 Jan 30 02:12 /usr/bin/passwd
```

`passwd` is owned by root and has the SUID permission, notice the `s` where the `x` should be in the user owner permissions. 

You can set the SUID permission by executing `chown u+s somefile`

The second advanced permission is SGID. If applied to an executable file it gives the user who executes the file the permissions of the group owner of that file. Applied to a directory it will set the default group ownership on files and subdirectories inside that directory:

```
$ mkdir somedirectory
$ ls -ld somedirectory
drwxrwxr-x. 2 joeri joeri 4096 May 9 16:10 somedirectory
$ chown .users somedirectory
$ ls -ld somedirectory
drwxrwxr-x. 2 joeri users 4096 May 9 16:10 somedirectory
$ chmod g+s somedirectory
$ ls -ld somedirectory
drwxrwsr-x. 2 joeri users 4096 May 9 16:10 somedirectory
$ cd somedirectory && touch somefile && ls -l
-rw-rw-r--. 1 joeri users 0 May 9 16:14 somefile
```

The third advanced permission is Sticky Bit. This permission is useful to protect files against accidental deletion in an environment where multiple users have write permissions in the same directory.  
  
If the Sticky Bit permission is applied to a directory, a user can delete a file only if he is the owner of the file or of the directory that contains the file.  
***The Sticky Bit permission can not be inherited from the parent directory.***

Use `chmod +t` followed by the name of the file or directory you want to apply the permission on.

{{<table "table table-dark table-striped table-bordered">}}
Permission | Absolute | Relative | Files | Directories
-----|----|-----|-----|-----
SUID  | 4 | u+s | Execute file with the permissions of the file owner | n/a
SGID     | 2 | g+s | Execute file with the permissions of the group owner | Files created in the directory get the same group owner.
Sticky Bit | 1 | +t | n/a | Prevent users from deleting files belonging to other users.
{{</table>}}