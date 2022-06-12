---
title: 'Access Control Lists, umask & User-Extended Attributes 101'
author: Joeri
date: 2020-05-10T07:12:26+00:00
url: /access-control-lists-umask-user-extended-attributes-101/
swp_cache_timestamp:
  - 442672
categories:
  - CentOS
  - Linux
  - Red Hat Enterprise Linux
tags:
  - Access Control Lists
  - ACL
  - User-Extended Attributes
  - RHEL
  - Red Hat
  - RHCSA

---

{{< image src="/img/Tux.png" alt="Tux" position="center" style="width: 100px;">}}


 
Access Control Lists allow you to add permissions to more than one user or group on the same file or directory, and allows you to set default permissions for newly created files and directories.

## Managing ACLs

It's possible you need need to add file system support for ACLs during boot time by adding the `acl` mount option the the `/etc/fstab` file. That would be the case when you're seeing the `Operation not supported` message when applying an ACL.

### Viewing and Changing ACL Settings

The `ls -l` command doesn't show any existing ACLs, it will show a `+` after the permission listing to indicate ACL permissions have been set:

```
drwxrwsr-x+ 2 joeri joeri 4096 May 9 16:14 somedirectory/
```

To show the current ACL settings, use the `getfacl` command:

```
$ getfacl somedirectory
# file: somedirectory
# owner: joeri
# group: joeri
# flags: -s-
user::rwx
group::rwx
group:joeri:rwx
mask::rwx
other::r-x
```

You can see the permissions are shown for the usual three entities.  
We use the `setfacl` command to add an ACL:

  * `setfacl -m g:users:rwx somedirectory` - Sets the RWX permissions for the group _users_
  * `setfacl -m u:joeri:rwx somedirectory` - Sets the RWX permissions for the user _joeri_
  * `setfacl -m g:sales:- somedirectory` - Removes all permissions for the group sales
  * `setfacl -R -m o::- somedirectory` - Recursively removes all permissions for the _others_ entitiy
  * `setfacl -x g:sales somedirectory` - Removes the ACL for the group _sales_.

### Working with default ACLs

Default ACLs allows you to enable inheritance. The default ACL will set the permissions on all new items that are created in a given directory, but will not change the permissions for existing files and subdirectories.

>Usually you will set ACLs twice:  
`setfacl -R -m` to modify the ACL for current files.  
`setfacl -m d:` to take care of all new items.  

`setfacl -m d:g:sales:rx somedirectory` Would set the read and execute permissions for the _sales_ group on all new files and subdirectories.  
  
Always set basic permissions first before applying ACLs, and avoid changing the basic permissions after applying ACLs.

## Setting Default Permissions with umask

When creating new files default permissions are set by the shell determined by the `umask` shell value which is applied during login.  
  
The `umask` numerical value is substracted from the maximum permissions a file or directory can get, 666 and 777 respectively.  
  
e.g. a `umask` setting of 022 will result in 644 for files (6-0, 6-2, 6-2) and 755 for directories (7-0, 7-2, 7-2). 

There are two ways to change the `umask` setting, either for all users or for individual users. The value is set in `/etc/login.defs` for all users and in `~.bashrc_profile` for an individual user.

{{<table "table table-dark table-striped table-bordered">}}
Value | Files | Directories
-----|----|-----
0  | RW | ALL
1     | RW | RW
2    | R | RX
3    | R | R
4   | W | WX
5  | W | WX
6   | - | X
7 | - | -
{{</table>}}


## Working with User-Extended Attributes

When working with permissions, there's always been a relationship between a user or a group, and a file or directory. This isn't the case with User-Extended Attributes, they do their work regardless of the user or group who accesses a file.

Just like ACLs, it's possible you need to add the `user_xattr` mount option.

There's a lot of attributes you can apply to a file, but I'll only cover one in particular which seems the most useful to me: The immutable attribute.  
The immutable attribute makes the file immutable, no changes can be made at all to file.

You can set an attribute using the `chattr` command:  
`chattr +i somefile` adds the immutable attribute to the file.  
Similarly, you can remove it using `chattr -i somefile`.

To list the current applied attributes use the `lsattr` command on a file.

