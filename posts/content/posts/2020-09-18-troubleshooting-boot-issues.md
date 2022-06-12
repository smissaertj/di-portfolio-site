---
title: "Troubleshooting Boot Issues"
date: 2020-09-18
url: /troubleshooting-boot-issues
draft: false
toc: false
images:
tags:
  - RHEL
  - Troubleshooting
  - Boot Arguments
  - Rescue Disk
  - Initramfs
  - Root Password
  - File System Issues
---

{{< image src="/img/redhat-8-logo.png" alt="Red Hat logo" position="center" >}}


## The RHEL8 Boot Procedure

In order to fix boot issues we need to be able to judge in which phase of the boot procedure the issue occurs so we can apply appropriate means to fix it.
The following steps summarize the boot procedure:

* **POST** - The machine is powered on, the Power-On-Self-Test executes and hardware required to start the system is initialized.
* **Boot device selection** - From UEFI or BIOS, a bootable device is located.
* **Loading the boot loader** - From the bootable device a boot loader is located.
* **Loading the kernel** - The kernel is loaded together with the initramfs. The initramfs contains kernel modules required to boot as well as initials scripts to proceed to the next stage of booting.
* **Starting /sbin/init** - The first process is loaded, `/sbin/init`, which is a symlink to Systemd. The udev daemon is loaded to take care of further hardware initialization. This all happens from initramfs.
* **Process initrd.target** - The Systemd process executes all units from the initrd.target, preparing a minimal operating environment from where the root file system on disk is mounted onto the `/sysroot` directory.
* **Switch to root file system** - The system switches to the root file system on disk and loads the Systemd process from disk.
* **Running the default target** - Systemd looks for the default target to execute and runs all of its units.

The below table summarizes where a specific phase is configured and what you can do to troubleshoot if something goes wrong.

{{<table "table table-dark table-striped table-bordered">}}
Phase | Configuration | Fix
-----|----|-----
**POST** | Hardware Configuration, BIOS, UEFI | Replace Hardware
**Boot Device** | BIOS/UEFI configuration or boot menu | Replace hardware or use rescue system
**Boot Loader** | `grub2-install` and edits to `/etc/defaults/grub` | GRUB Boot menu, edits to `/etc/defaults/grub` followed by `grub2-mkconfig`
**Kernel** | Edits to GRUB config and `/etc/dracut.conf` | GRUB Boot menu, edits to `/etc/defaults/grub` followed by `grub2-mkconfig`
**/sbin/init** | Compiled into initramfs | **init=** kernel boot argument, **rd.break** kernel boot argument, recreate initramfs
**initrd.target** | Compiled into initramfs | recreate initramfs
**Root file system** | Edits to `/etc/fstab` | Edits to `/etc/fstab`
**Default Target** | `systemctl set-default` | Start rescue.target as a kernel boot argument
{{</table>}}


## Passing Kernel Boot Arguments

The GRUB boot prompt offers a way to stop the boot procedure and pass specific options to the kernel.
When you see the GRUB2 menu, type **e** to enter a mode where you can edit commands and scroll down to the section that begins with `linux ($root)/vmlinuz`. This line tells GRUB how to start a kernel and looks similar to this:
```
linux ($root)/vmlinuz-4.18.0-193.19.1.el8_2.x86_64 root=/dev/mapper/cl-root ro crash kernel-auto resume=/dev/mapper/cl-swap rd.lvm.lv=cl/root rd.lvm.lv=cl/swap rhgb quiet
```

Additional boot arguments need to be added to the end of this line.

The **rhgb** and **quiet** boot options hide boot messages, we can remove these in order to see what's happening when we boot the machine.
Once you made the necessary changes, press `CTRL+X` to start the kernel. Note that this change is not persistent, to make them persistent we must modify the content of `/etc/default/grub` and use **grub2-mkconfig -o /boot/grub2/grub.cf** to apply the change.


## Starting a Troubleshooting Target

In the GRUB boot prompt we can use several options to allow us to fix our issue:

* **rd.break** - Stops the boot procedure in the initramfs phase. This option is useful if you don't have the root password.
* **init=/sbin/bash** - A shell will be started immediately after loading the kernel and initrd.target.
* **systemd.unit=emergency.target** - Enters a mode that loads the bare minimum of required Systemd units, it requires a root password.
* **systemd.unit=rescue.target** - Starts more Systemd units to bring up a more complete operational mode. 


## Using a Rescue Disk

The default rescue image for RHEL is on the installation disk. When booting from the installation disk you'll see a `Troubleshooting` menu item which presents you with the following options:

* **Install RHEL in Basic Graphics Mode** - This option reinstalls the machine. You should not use it unless a normal installation does not work and you need basic graphics mode.
* **Rescue a RHEL System** - This options prompts you to press Enter to start the installation, but only loads a rescue system. It does not overwrite the current configuration. The Rescue System will try to find an installed Linux system and mount it on `/mnt/sysimage`. If a valid installation was found and mounted you can press Enter twice to access the rescue shell. At this point we can switch to the root file system on disk to access all tools we need to repair the system: `chroot /mnt/sysimage`
* **Run a Memory Test** - If you encounter memory errors this tool allows you to mark bad memory chips so you can boot your machine normally.
* **Boot from Local Drive** - If you cannot boot from GRUB on your usual boot device try this option. It offers a boot loader that will try to load the OS from your hard disk.


### Reinstalling Grub Using a Rescue Disk

One of the most common reasons to start a rescue disk is if the GRUB2 boot loader breaks. Once you have access to your machine using the rescue disk, reinstalling GRUB2 is a two step process:
* Make sure you switch to the root file system on disk: `chroot /mnt/sysroot`
* Use **grub2-install** followed by the name of the device on which you want to reinstall GRUB2, i.e. `grub2-install /dev/sda`

### Recreating Initramfs Using a Rescue Disk
You know there is a problem with initramfs when you never see the root file system getting mounted on the root directory and don't see any Systemd unit files being started when analyzing the boot procedure.

To repair the initramfs image after booting into the rescue environment you can use the **dracut** command. **dracut --force** overwrites the existing initramfs and creates a new initramfs image for the currently loaded kernel. There is also the `/etc/dracut.conf` configuration file you can use to include specific options while re-creating initramfs. The **dracut** configuration itself is dispersed over several locations:
* `/usr/lib/dracut/dracut.conf.d/` - Contains the system default configuration files
* `/etc/dracut.conf.d/` - Contains custom dracut configuration files
* `/etc/dracut.conf` - The master configuration file



## Recovering from File System Issues
When there is a misconfiguration in the file system mounts the boot procedure may end with the "Give root password for maintenance" message. If a device does not exist or there's an error in the UUID, for example, Systemd waits to see if the device comes back online by itself. When that doesn't happen, the "Give root password for maintenance" message appears.

After entering the root password, issue the **journalctl -xb** command to see if relevant messages providing information about what is wrong are written to the journal. If the problem is indeed file system oriented we need to make sure the root file system is mountend with read/write rights, analyze what's wrong in `/etc/fstab` and fix that: `mount -o remount,rw /`

## Resetting the Root Password
When the root password is lost, the only way to reset it is to boot into minimal mode which allows you to login without using a password:

* Pass the **rd.break** boot argument to the kernel
* Boot the system
* The boot procedure stops after loading initramfs and before mounting the root file system.
* Re-mount the root file system on disk to get read/write access to the system image: `mount -o remount,rw /sysroot`
* Make the contents of the `/sysroot` directory the new root directory: `chroot /sysroot`
* Use the **passwd**  command to set the new password.
* Load the SELinux policy: `load_policy -i`
* Set the correct SELinux contect type to `/etc/shadow`: `chcon -t shadow_t /etc/shadow`
* Reboot by issuing the **exit** command twice. Use the new root password at the next boot.

> An alternative to applying the SELinux context to `/etc/shadow` is to create the `/.autorelabel` file which forces SELinux to restore labels set on the entire file system the next time the system is booted.