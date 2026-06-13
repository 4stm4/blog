---
layout: post
title:  "Building a Native Linux Container from Scratch"
date:   2026-06-13 17:17:17 +0500
categories: Linux
language: en
---

A Linux container is essentially an ordinary process that is given a restricted view of the system via kernel features.  In practice, one creates a new **root filesystem**, and uses Linux **namespaces** and **cgroups** to isolate that process.  Unlike a VM, a container uses the same kernel as the host but “sees” different global resources.  For example, one process group might have its own filesystem root, process tree, hostname, network interfaces, and resource limits, while the host remains unchanged. The steps below show how to set this up manually using `unshare`, `chroot`, and related tools.

## 1. Why *chroot* Is Not Full Isolation

The traditional `chroot` command (and `chroot()` system call) **only changes the process’s root directory** – it does *not* create a sandbox.  The [chroot manual](https://man7.org/linux/man-pages/man2/chroot.2.html) explicitly states that chroot “changes the root directory of the calling process” and “does nothing else.”  It is *not* a security mechanism and was never meant to fully isolate a process. In other words, after a chroot:

- **Filesystem isolation:** Paths starting at `/` now resolve inside the new directory tree.
- **Everything else is unchanged:** The process still runs under the same kernel, sees the same process table, network interfaces, UIDs, devices, etc.  

As one expert explains: “`chroot` is not a container, it just changes the view of the filesystem. Network is still the same, devices are still the same, PIDs are still the same, UIDs are still the same, root is still root.”.  In fact, actions inside a chroot can affect the host. For example, a daemon started inside a chroot that binds to a port will occupy that port on the host. If you run `killall` inside the chroot, it can kill host processes. Installing packages in a chroot might inadvertently start daemons on the host or fail to start expected services. 

Because of these limitations, **real containers rely on namespaces** to provide stronger isolation.  The core idea is simple: a container is *usually just a normal Linux process, but with a different view of the system*.  It might have a different root filesystem, a different process ID space, a different hostname, a different network stack, and so on.  All of this is done via kernel namespaces and cgroups. 

> **Production note: `chroot` vs `pivot_root`**
>
> This article uses `chroot` because it is simple, easy to inspect, and useful for understanding the basic idea of changing a process’s filesystem view.
>
> Real container runtimes usually go further. Instead of relying on `chroot`, they use `pivot_root`, which switches the process to a new root filesystem and moves the old root to a temporary location. After that, the old root can be unmounted, making it much harder for the containerized process to retain access to the host filesystem.
>
> In short: `chroot` is good for learning the concept. `pivot_root` is closer to what production runtimes such as `runc` use when setting up a container root filesystem.


## 2. Namespaces: The Building Blocks of Isolation

Namespaces are kernel features that wrap global resources.  They make processes inside the namespace *appear* to have their own instance of that resource, invisible to processes outside.  One use of namespaces is to implement containers. The main namespace types are:

- **PID namespace:** Processes get a new process ID tree (they see a new PID 1 inside).  
- **Mount namespace:** The process has its own view of filesystem mounts (so it can mount/unmount without affecting the host).  
- **UTS namespace:** The process sees its own hostname and domain name (so you can set a hostname inside the container).  
- **Network namespace:** The process has its own network interfaces, IP routing table, firewall rules, etc.  
- **IPC namespace:** The process has its own System V IPC objects and POSIX message queues.  
- **User namespace:** The process can have different user/group ID mappings (it can have UID 0 *inside* without being root on the host).  
- **Cgroup namespace:** The process sees a virtualized `/proc/self/cgroup` and a separate cgroup root.  
- **Time namespace (since Linux 5.6):** The process can have a separate view of system clocks.  

Each namespace type isolates one resource type.  For example, in a new PID namespace children get their own PIDs starting at 1, and in a new mount namespace mounting or unmounting has no effect on the host.  Namespaces are typically created via the `clone()` or `unshare()` system calls (the `unshare` command is a user-friendly wrapper). 

Key namespaces include:
- **CLONE_NEWPID (PID):** separate process table.  
- **CLONE_NEWNS (Mount):** separate filesystem mounts.  
- **CLONE_NEWUTS (UTS):** separate hostname and domain name.  
- **CLONE_NEWNET (Network):** separate network stack (interfaces, routing, etc.).  
- **CLONE_NEWIPC (IPC):** separate IPC namespace.  
- **CLONE_NEWUSER (User):** separate UID/GID mapping.  
- **CLONE_NEWCGROUP (Cgroup):** separate cgroup hierarchy (root).  
- **CLONE_NEWTIME (Time):** separate boot/monotonic clocks.  

The [namespaces manpage](https://man7.org/linux/man-pages/man7/namespaces.7.html) summarizes this neatly: “A namespace wraps a global system resource in an abstraction that makes it appear to the processes within the namespace that they have their own isolated instance of the global resource… One use of namespaces is to implement containers.”. 

By combining the right namespaces, we can give a process its own “mini system”: a separate rootfs, process tree, hostname, network, etc.  For example, `unshare --mount --pid --uts --net --ipc --fork` can put the shell into six new namespaces at once (mount, PID, UTS, network, IPC, and a separate PID, forking a child), all in one go.

> **Namespace isolation (summary)**: With namespaces, one container process can have its own mounts (`mount` namespace), processes (`PID` namespace), hostname (`UTS` namespace), network stack (`net` namespace), IPC objects (`IPC` namespace), and user IDs (`user` namespace) without seeing or affecting the host’s.  Namespaces are the real “magic” behind containers.

## 3. Preparing the Root Filesystem

Before we isolate the process, we need a root filesystem (rootfs) to run inside.  This can be a directory containing a minimal Linux installation (for example, an Alpine or Debian rootfs).  Many container tutorials use Alpine because it’s very small.  In fact, Alpine’s official site provides a “mini root filesystem” tarball explicitly for containers.  For example, on Alpine’s downloads page there is a section:

> *Mini root filesystem. For use in containers and minimal chroots.*

Downloading and extracting that tarball (for your architecture) gives you `/path/to/rootfs` with `/bin`, `/etc`, etc.  Another option is to use a tool like `debootstrap` or `apk.static` to create a Debian/Alpine base system.  The exact steps depend on the distro, but the result is a directory that contains a working shell (`/bin/sh`), the standard library, and basic system directories.

For example, to bootstrap Alpine without root, one can use the static `apk` tool (as shown [here](https://blog.brixit.nl/bootstrapping-alpine-linux-without-root/)) and then populate `/dev` inside it.  Once you have the rootfs directory ready and filled (let’s call it `rootfs/`), we will use `chroot` inside the new namespace to run commands in that environment.

## 4. Starting the Container: Unshare, Chroot, and /proc

With a rootfs directory in place, the next step is to enter new namespaces and `chroot` into it.  A common pattern is:

```bash
sudo unshare \
  --mount \
  --pid \
  --uts \
  --ipc \
  --net \
  --user \
  --fork \
  --mount-proc \
  chroot rootfs /bin/sh
```

This one command does several things (we use `sudo` to ensure we have privileges to create namespaces):

- `--mount`, `--pid`, `--uts`, `--ipc`, `--net`, `--user`: create new mount, PID, UTS, IPC, network, and user namespaces for the process.
- `--fork`: fork a child process (`/bin/sh`) so that the shell is PID 1 in the new PID namespace.
- `--mount-proc`: automatically mounts a new `/proc` filesystem inside the new mount namespace (needed for many tools).
- `chroot rootfs /bin/sh`: inside the namespaces, `chroot` into our prepared rootfs and run `/bin/sh`.

Here’s a breakdown of why each option is used:

- **Mount namespace (`--mount`)**: Ensures mount/unmount operations do not affect the host. After entering, we usually remount `/proc`, `/sys`, `/dev` inside the rootfs.
- **PID namespace (`--pid` + `--fork`)**: Causes the shell (the command after `--fork`) to run as PID 1 in the new namespace, with its own process tree. The `--fork` is needed so that `/bin/sh` (the second process) becomes PID 1.
- **UTS namespace (`--uts`)**: Gives the shell its own hostname (so `hostname` inside the container can be changed without affecting the host).
- **IPC namespace (`--ipc`)**: Isolates System V IPC and POSIX message queues.
- **Network namespace (`--net`)**: Gives the container its own loopback and network devices.
- **User namespace (`--user`)**: Allows us to map the container’s root user (UID 0) to our user outside.  This often goes with `--map-root-user` or equivalent, so we don’t actually need to be real root inside.
- **Mount `/proc` (`--mount-proc`)**: As the [unshare manpage](https://man7.org/linux/man-pages/man1/unshare.1.html) notes, this option “mounts the proc filesystem at mountpoint (default /proc)… Useful when creating a new PID namespace.” In fact, it **implies a new mount namespace** so the proc mount doesn’t leak to host.

Mounting `/proc` is important: many commands (like `ps`, `ls /proc`, etc.) expect `/proc` to reflect the container’s PID namespace. Without it, the shell might behave strangely or not see its own children properly.  The `--mount-proc` option saves us from manually doing `mount -t proc` (although one can also do that by hand inside).

Once we run the above `unshare ... chroot` command, we are dropped into an isolated shell that *thinks* it is PID 1 in its own world, with `/` being our `rootfs` folder. For example, if we run `ps -ef` here, we’ll only see two processes (the shell itself and `ps`), not the host’s processes. The host’s PID 1 (init/systemd) is invisible. This matches the behavior shown in NGINX’s example: inside the new namespace, you see only your own processes. 

> **Example shell session inside a namespace:** Notice how after unshare we are `root` inside and see only our shell and `ps`.  
> ```
> root # ps -ef
> UID   PID  PPID ... CMD
> root     1     0 ... bash
> root     5     1 ... ps -ef
> root # id
> uid=0(root) gid=0(root) ...
> ```  
> Outside (host) this shell is not root (it’s our normal user) and sees many processes.  

## 5. Configuring the Container Environment

Now that we are in a fresh namespace with `chroot` applied, the environment needs a few basic mounts and settings to feel like a Linux system:

- **Mount `/proc`, `/sys`, `/dev`** inside the `rootfs` (if not already done by `--mount-proc`).  For example:
  ```bash
  mount -t proc proc /proc
  mount -t sysfs sysfs /sys   # if the shell or commands need /sys
  mkdir -p /dev && mount -o bind /dev /dev
  ```
  These commands should be done *inside* the `rootfs` view (after `chroot`). They populate `/proc`, `/sys`, and `/dev` so that tools inside the container work properly. (Without `/proc`, commands like `ps` and `top` won’t function, since they read `/proc`.) The `--mount-proc` option does the `mount -t proc /proc`, but you may need to do others manually.

- **Hostname**: You can set a container-specific hostname:
  ```bash
  hostname container1
  ```
  This only affects the container’s UTS namespace.

- **Network**: At this point, the container has a private network namespace but no external connectivity.  You will typically create a virtual Ethernet pair (`veth`) connecting this namespace to the host, and set up routing/NAT on the host side.  Those steps are beyond the scope here, but in short, you would use `ip link` and `ip netns` to attach an interface to the container’s namespace.  For a minimal example, you could skip network isolation or use `ip netns` commands on the host.

- **User and Groups**: Inside the container, the user appears as root if we mapped our UID 0→0.  But be careful: if you’re running as your normal user outside, you’ll typically do `--map-root-user` so that the new namespace’s root is your user outside. If not mapping, the container will see only root (and no other users) by default. One can create a non-root user in the container (`adduser` inside `rootfs/etc/passwd`) if needed.

At this point, your container shell in `rootfs` can run commands. For example, running `ls /` should show only the files from the rootfs, not the host’s. The container cannot (easily) see or affect the host’s file system outside `rootfs`.

## 6. Applying cgroups for Resource Control

So far, we have isolated *visibility* (namespaces) but have not limited resource usage.  Linux **cgroups** (control groups) are used to restrict CPU, memory, and I/O for a group of processes. A container runtime typically creates a cgroup for the container and assigns the container’s processes to it.

As [man7](https://man7.org/linux/man-pages/man7/cgroups.7.html) describes, cgroups allow processes to be organized hierarchically and limited/monitored. In practice, one might do something like:

```bash
# Create a new memory and CPU cgroup for container "ctr1"
cgcreate -g cpu,memory:/ctr1
cgset -r memory.limit_in_bytes=100M /ctr1
cgset -r cpu.cfs_quota_us=50000 /ctr1  # limit CPU to 50%
cgclassify -g cpu,memory:/ctr1 <pid-of-container-shell>
```

This would limit the container’s processes to 100 MB RAM and 50% CPU.  Without cgroups, the container could use unlimited host resources.  (The [cgroups manpage](https://man7.org/linux/man-pages/man7/cgroups.7.html) explains these controllers and hierarchy.) 

Practically, for a manual container you could skip cgroups or use tools like `cgexec`, but any container runtime should apply them.  The NGINX blog points out that cgroups let you set *Resource limits, Prioritization, Accounting, and Control* for a process group. The embedded figure (below) illustrates how allocating 30% CPU to a cgroup leaves 70% for others:

 *Figure: Linux cgroups let you allocate fixed shares of resources to a group (here 30%) while the rest (70%) remains for others.*  

*(Image: an example of allocating CPU shares via cgroups; source: NGINX blog)*

> **Security note: namespaces and cgroups are not the whole story**
>
> Namespaces change what a process can see. Cgroups control what a process can use. But a production-grade container also needs to reduce what the process is allowed to do.
>
> This is where Linux capabilities and seccomp become important. Capabilities split the traditional power of `root` into smaller privileges, allowing the runtime to remove dangerous permissions such as loading kernel modules or changing host-level networking. Seccomp filters restrict the system calls available to the container, blocking kernel entry points that the workload should never need.
>
> This is why Docker, Podman, and OCI runtimes combine namespaces, cgroups, capabilities, seccomp, and mount rules. A container is not one isolation mechanism. It is a layered security model built from several Linux primitives.


## 7. Putting It All Together: Example Session

Here’s an example of steps you might actually run (on a modern Linux host) to try this yourself:


> **Runtime note: root-based setup vs rootless containers**
>
> The final script is written to be executed with `sudo`. This keeps the example straightforward, especially when creating veth pairs, bridges, routes, and cgroups from the host side.
>
> Because the script already runs with real root privileges on the host, options such as `--user` and `--map-root-user` are not strictly required for that specific flow.
>
> For a rootless setup, the design changes: UID/GID mappings must be configured through `/etc/subuid` and `/etc/subgid`, and the runtime must carefully map the container’s root user to an unprivileged host user. That is the model used by rootless container engines.


1. **Download a minimal rootfs.** For example, on x86_64 you could get Alpine’s tarball:  
   ```bash
   wget https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/x86_64/alpine-minirootfs-3.24.0-x86_64.tar.gz
   mkdir rootfs && tar xzf alpine-minirootfs-3.24.0-x86_64.tar.gz -C rootfs
   ```
   Now `rootfs/` contains an Alpine Linux filesystem. (Alpine’s site calls this the “mini root filesystem” for use in containers.)

2. **Enter new namespaces and chroot**:  
   ```bash
   sudo unshare --mount --pid --uts --ipc --net --fork --mount-proc \
       --user --map-root-user \
       chroot rootfs /bin/sh
   ```  
   This gives you a shell inside the container. Note we used `--map-root-user` so that inside the user namespace the shell is effectively `root` (UID 0) without being root on the host. The `--fork` ensures the shell is PID 1 inside.  

3. **Inside the container shell:** mount essential filesystems:  
   ```sh
   mount -t proc proc /proc     # if --mount-proc didn't do it
   mount -t sysfs sysfs /sys
   mount -o bind /dev /dev
   ```  
   Now commands like `ps aux` and `ip addr` will reflect the container’s own mounts and processes. For instance, `ps aux` should show only a couple processes, not the host’s.

4. **Test isolation:**  
   ```sh
   echo "Hostname inside: $(hostname)"
   hostname container1
   ping -c1 127.0.0.1    # works (lo interface in namespace)
   ifconfig             # shows only loopback and any veth in this namespace
   ```  
   If you try `ps -ef`, you’ll see only your shell (PID 1) and any processes you start, not the host’s. If you try `mount`, you’ll see mounts inside the new namespace.

5. **Apply cgroups (on host):** In another terminal on the host, you can find the container’s PID (say it’s 1000) and do:  
   ```bash
   sudo cgcreate -g cpu,memory:/myctr
   sudo cgset -r memory.limit_in_bytes=50M /myctr
   sudo cgset -r cpu.cfs_quota_us=25000 /myctr   # 25% CPU
   sudo cgclassify -g cpu,memory:/myctr 1000
   ```  
   Now the container’s processes (in cgroup `myctr`) are limited.

## 8. Common Pitfalls and Troubleshooting

- **Privileges:** Creating namespaces usually requires privileges (CAP_SYS_ADMIN), so you typically need to run `unshare` with `sudo` or as root. User namespaces can relax this but require setup (`/etc/subuid` mappings). 
- **/proc access:** Tools like `ps` will be confusing if `/proc` isn’t mounted inside the container’s namespace. Always ensure `/proc` is mounted (or use `--mount-proc`).
- **Chroot pitfalls:** Remember that `chroot` does not change your current directory, so do `cd /` after chroot. Also, if you `chroot` without `unshare`, remember the escape trick: root can `mkdir x; chroot x; cd ..` to break out! Namespaces prevent that kind of escape.
- **Network:** After `--net`, there is typically no network inside until you configure a veth or tap. Without setup, the container only has loopback (`lo`).
- **File descriptors:** Open FDs before unshare might remain open inside the container unless cleaned up.

## 9. Further Reading

Building containers by hand is an educational exercise. For more details, see the Linux manpages on [namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html), [unshare(1)](https://man7.org/linux/man-pages/man1/unshare.1.html), [chroot(2)](https://man7.org/linux/man-pages/man2/chroot.2.html), and [cgroups(7)](https://man7.org/linux/man-pages/man7/cgroups.7.html).  Tutorials like the [NGINX blog on namespaces and cgroups](https://blog.nginx.org/2022/07/15/what-are-namespaces-cgroups-how-do-they-work.html) and container-from-scratch guides provide practical examples.

By understanding these primitives (and using tools like `unshare` and `nsenter`), one gains a deep insight into how container runtimes (Docker, Podman, etc.) work under the hood: they simply automate steps like the above, giving you `unshare` + `chroot` in a convenient command. All the complexity of “containers” boils down to **change what the process can see (namespaces), then control what it can use (cgroups)**.

**Sources:** Official Linux man pages and documentation were used to explain namespaces, chroot, and cgroups in detail, alongside practical container tutorials.
