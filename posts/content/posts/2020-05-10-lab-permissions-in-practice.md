---
title: 'Lab: Permissions In Practice'
author: Joeri
date: 2020-05-10T16:57:26+00:00
url: /lab-permissions-in-practice/
categories:
  - Lab
  - Linux
tags:
  - file permissions
  - lab

---

{{< image src="/img/laptop.png" alt="Kinsta Inc. logo" position="center" >}}


In the previous two posts we learned about basic and advanced permissions, Access Control Lists, umask and extended-attributes.  
Let's put this knowledge to work by setting up a shared group environment


## Lab Objectives

  1. Create 4 random users and two groups: `finance` & `sales`.  
    Add two users to the first group and two to the second group.
  2. Create 2 directories: `/data/finance` & `/data/sales`.  
    Make the group `sales` the group owner of the directory `sales`, and make the group `finance` the group owner of the directory `finance`. Make sure the user owner of the directories is `root`.  
    Group owners should have full access to their directories and, no permissions should be assigned to the others entity.
  3. The others entity should have no permissions on newly created files and directory within the _entire_ `/data` structure.
  4. Set the permissions so that members of the group `sales` can read files in the `/data/finance` directory, and members of the group `finance` can read files in the `/data/sales` directory.
  5. Ensure that all new files and directories inherit the group owner of their respective directory. 
  6. Ensure that users are only allowed to remove files of which they are the owner.


## Lab Solution

### Objective 1

We'll create the `finance` and `sales` group, as well as the users `betty, bob, bill` and `bea`. We'll add `betty` and `bob` to `finance`, and `bill` and `bea` to `sales`. 

```
[root@server1 ~]# groupadd finance && groupadd sales
[root@server1 ~]# for i in betty bob bill bea; do useradd $i; done
[root@server1 ~]# usermod -aG finance betty && usermod -aG finance bob
[root@server1 ~]# usermod -aG sales bill && usermod -aG sales bea
[root@server1 ~]#
```

### Objective 2

```
[root@server1 ~]# groupadd finance && groupadd sales
[root@server1 ~]# for i in betty bob bill bea; do useradd $i; done
[root@server1 ~]# usermod -aG finance betty && usermod -aG finance bob
[root@server1 ~]# usermod -aG sales bill && usermod -aG sales bea
[root@server1 ~]# mkdir -p /data/finance /data/sales
[root@server1 ~]# chown :finance /data/finance
[root@server1 ~]# chown :sales /data/sales
[root@server1 ~]# chown root /data/finance
[root@server1 ~]# chown root /data/sales
[root@server1 ~]# chmod g+rwx /data/finance
[root@server1 ~]# chmod g+rwx /data/sales
[root@server1 ~]# chmod o-rwx /data/finance
[root@server1 ~]# chmod o-rwx /data/sales
[root@server1 ~]# ls -l /data
total 0
drwxrwx---. 2 root finance 6 May 10 20:16 finance
drwxrwx---. 2 root sales 6 May 10 20:16 sales
[root@server1 ~]#
```

### Objective 3

We set the default ACL for the _others_ entity to no permissions recursively, these permissions will apply to all newly created files and directories. Then apply a regular ACL. 

```
[root@server1 ~]# setfacl -R -m d:o::- /data
[root@server1 ~]# setfacl -R -m o::- /data
```

We'll make sure our two groups can access the `/data` directory and any new sub-directory.

```
[root@server1 /]# setfacl -m d:g:sales:rx,d:g:finance:rx /data
[root@server1 /]# setfacl -m g:sales:rx,g:finance:rx /data
```

You can verify your work using `getfacl`.

### Objective 4

We start by setting the default ACLs:

```
[root@server1 ~]# setfacl -m d:g:sales:rx,d:g:finance:rwx /data/finance/
[root@server1 ~]# setfacl -m d:g:finance:rx,d:g:sales:rwx /data/sales
```

And afterward, we set the ACLs for the current files and directories (although there are none, it's best practice):

```
[root@server1 ~]# setfacl -R -m g:sales:rx,g:finance:rwx /data/finance
[root@server1 ~]# setfacl -R -m g:finance:rx,g:sales:rwx /data/sales
```

Remember that we need to set _execute_ permissions on the directory level in order to be able to read a file contained inside that directory.

### Objective 5

We set the SGUID permission on both the `sales` and `finance` directories:

```
[root@server1 ~]# chmod g+s /data/sales
[root@server1 ~]# chmod g+s /data/finance
[root@server1 ~]# ls -l /data
total 0
drwxrws---+ 2 root finance 6 May 10 20:16 finance
drwxrws---+ 2 root sales 6 May 10 20:16 sales
```

### Objective 6

We set the Sticky Bit permission on both directories:

```
[root@server1 ~]# chmod +t /data/sales
[root@server1 ~]# chmod +t /data/finance
[root@server1 ~]# ls -l /data
total 0
drwxrws--T+ 2 root finance 6 May 10 20:16 finance
drwxrws--T+ 2 root sales 6 May 10 20:16 sales
```

## Verifying the solution

We'll test the applied permissions for some of the users we created.

Login as `bill` from `sales` and create a file:

```
[root@server1 ~]# su - bill
[bill@server1 ~]$ echo 'Hello!' &gt; /data/sales/bill_file
[bill@server1 ~]$ exit
[root@server 1 ~]#
```

Let's check what `betty` from `finance` can do:

```
[root@server1 ~]# su - betty
[betty@server1 ~]$ cd /data
[betty@server1 data]$ ls
finance sales
[betty@server1 data]$ cd finance/
[betty@server1 finance]$ ls
[betty@server1 finance]$ touch betty_file
[betty@server1 finance]$ ls -l
total 0
-rw-rw----+ 1 betty finance 0 May 10 20:45 betty_file
[betty@server1 finance]$ cd /data/sales/
[betty@server1 sales]$ ls
bill_file
[betty@server1 sales]$ cat bill_file
Hello!
[betty@server1 sales]$ rm bill_file
rm: remove write-protected regular file 'bill_file'? y
rm: cannot remove 'bill_file': Permission denied
[betty@server1 sales]$ touch betty_sales
touch: cannot touch 'betty_sales': Permission denied
[betty@server1 sales]$
```

We see that `betty` can create new files in `/data/finance`, and the group owner is set to `finance`. Betty can read files in `/data/sales` but can't delete or create new files.

Let's login as `bob` from finance:

```
[root@server1 /]# su - bob
[bob@server1 ~]$ cd /data/finance/
[bob@server1 finance]$ cat betty_file
Hello!
[bob@server1 finance]$ rm betty_file
rm: cannot remove 'betty_file': Operation not permitted
[bob@server1 finance]$
```

Bob can do everything Betty can, but won't be able to delete files that don't belong to him. 


>#### Important!
> **The Sticky Bit permission can not be inherited from the parent directory.**
> This means that if Bob creates a new directory in `/data/finance` but doesn't change the permissions on that directory, then Betty will be able to read, write and execute files in Bob's new directory.  
>Bob can set any permission he likes on his new directory since he's the user owner.