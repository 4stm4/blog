---
layout: post
title:  "Построение контейнера «с нуля» с Linux-namespace и cgroups"
date:   2026-06-13 17:17:17 +0500
categories: Linux
language: en
---

# Executive Summary  
A Linux **container** is essentially a normal process that has a _restricted view_ of the host system, achieved by kernel features rather than full hardware emulation.  Containers share the host’s kernel but use **namespaces** to isolate resources (process IDs, network, filesystems, etc.) and **cgroups** to limit resource usage.  This guide shows how to build a native container “from scratch” using the `unshare` and `chroot` commands on a modern Linux system. We explain the theory (namespaces, cgroups, and `/proc`), step-by-step commands to create a basic container, how to add networking (veth/bridge/NAT), how to apply cgroup limits, and the security implications.  We include code examples, comparison tables, a troubleshooting checklist, and diagrams to illustrate concepts. The result will be a mini “container runtime” without Docker, useful for understanding how containers really work under the hood.

# Container Concepts and Mental Model  
A container is **not** a full virtual machine – it shares the host OS kernel.  Instead, it provides **isolation** and **resource control** using Linux primitives.  In essence, a container is just a regular Linux process (or set of processes) that has been moved into new namespaces and cgroups.  Namespaces wrap global resources so that processes inside the container see their own isolated instance of those resources.  Cgroups (control groups) then **limit** and **account for** how much CPU, memory, network, etc. the container can use.

- **Namespace isolation:** Each container has its own view of system resources. For example, it sees a separate PID tree, filesystems, network interfaces, hostname, and IPC objects.  This makes processes inside the container “think” they are the only ones on the system.  
- **Resource control:** Cgroups ensure the container can’t starve the host. A cgroup can enforce CPU shares, memory limits, I/O limits, etc., on all processes in the container.  

These two features (namespaces + cgroups) are the foundation of containerization.  Unlike a VM, a container has negligible overhead because there’s no second kernel – it just uses the existing Linux kernel with different views of it.  In user experience, it looks like a tiny Linux system (with its own PID 1, etc.), but under the hood it's simply Linux processes with restricted capabilities.

# chroot: Changing Root, Not Full Isolation  
The `chroot` command changes the apparent root directory (`/`) for a process. This confines filesystem access to a given directory tree. For example:  
```bash
sudo chroot /container /bin/sh
```  
makes `/container` appear as `/` inside the shell.  However, **chroot by itself is not a security or isolation mechanism**. It only affects file path resolution; it does **not** create new PID, network, user, or other namespaces. A chrooted process still runs in the same kernel, sees all the host’s processes, uses the same network stack, etc. (In fact, a root user can “escape” a simple chroot jail by using `chroot` again or other tricks.) Therefore, on its own, chroot is **insufficient for container security**. True containers use chroot (or better, pivot_root) *inside* new namespaces to isolate even the filesystem view. 

# Linux Namespaces: Types and Effects  
Linux provides several namespace types, each isolating a different global resource. The most commonly used for containers are:

- **Mount namespace (`mnt`, CLONE_NEWNS):** Each namespace gets its own set of filesystem mount points. In a new mount namespace, initially all mounts from the parent are copied, but changes (mount/unmount) no longer affect the host or other namespaces. This allows a container to remount or hide parts of the filesystem without impacting the host.  
- **PID namespace (CLONE_NEWPID):** Processes inside see their own process ID tree. The first process in a new PID namespace gets PID 1 (just like init). Orphaned processes are reparented to that PID 1. Importantly, the container’s PID 1 is distinct from the host’s PID 1. If the PID 1 inside a container exits, the kernel will kill all processes in that namespace, effectively shutting down the container.  
- **Network namespace (`net`, CLONE_NEWNET):** Virtualizes the network stack. A new network namespace starts with only a loopback (`lo`) interface, initially down. It has its own IP addresses, routing table, firewall rules, etc. No physical interfaces are in it until you add them. Typically we create a virtual Ethernet pair (veth) to link the container’s netns to the host’s network (see below). Destroying a netns also destroys its virtual interfaces.  
- **IPC namespace (CLONE_NEWIPC):** Isolates System V IPC and POSIX message queues. Processes in different IPC namespaces cannot see or use each other’s shared memory segments, semaphores, or message queues.  
- **UTS namespace (CLONE_NEWUTS):** Isolates two system identifiers: the hostname and NIS domain name. Inside a UTS namespace, a process can freely change the hostname without affecting the host or other containers.  
- **User namespace (CLONE_NEWUSER):** Provides separate UID/GID mapping. A user namespace lets a container have its own user ID space. Most importantly, the container’s root (UID 0) can be mapped to an unprivileged user ID on the host. This means a process running as “root” in the container is actually a normal user on the host, mitigating the risk if it escapes. For example, the container’s root (0) might map to host UID 100000. Even if that process breaks out of other namespaces, the kernel still treats it as UID 100000 on the host, limiting damage.  
- **Cgroup namespace (CLONE_NEWCGROUP):** Hides the details of control group hierarchy. A process inside this namespace sees `/proc/self/cgroup` as just `/` (so it doesn’t see the host’s cgroup path), preventing information leaks. (This is a newer namespace mainly for privacy and seamless migration.)  

Each namespace is independent and orthogonal: a container typically unshares a combination of namespaces so that inside it has its own PID tree, mounts, network, etc. All these namespaces are created via `clone()` or the `unshare` command (below). The manual *namespaces(7)* explains: “One use of namespaces is to implement containers”.

# The Role of `/proc` and `--mount-proc`  
The **proc filesystem** (`procfs`) is a virtual filesystem (/proc) that provides information about processes and the system. In a new PID namespace, `/proc` must be remounted to reflect the namespace’s view of PIDs. If you enter a new PID namespace without mounting a fresh procfs, commands like `ps` inside will still show the host’s processes, or even malfunction.

The `unshare` command offers a convenient `--mount-proc` option. This does two things in one go: it unshares a new mount namespace and mounts a new `proc` filesystem for the new PID namespace. For example: 
```bash
unshare --fork --pid --mount-proc /bin/bash
```
This makes a shell in a new PID namespace with `/proc` automatically reflecting only the new namespace’s PIDs. In summary, **mounting `/proc` inside the container namespace** is critical for tools to see the correct processes and system info.

# Control Groups (cgroups) and Resource Limits  
**Control groups** allow grouping processes and enforcing resource limits on them. A cgroup can limit how much CPU time, memory, disk I/O, network bandwidth, etc. a set of processes may use. In a container, all processes usually belong to the same cgroup, so the runtime can restrict the entire container’s resource usage.

Cgroups have evolved: 
- **v1:** Separate hierarchies for each resource (e.g. `/sys/fs/cgroup/memory`, `/cpu`, etc.). You create a subdirectory and write to files like `memory.limit_in_bytes`, `cpu.shares`, etc.  
- **v2:** A unified hierarchy (`/sys/fs/cgroup/unified`) with simpler interfaces (`memory.max`, `cpu.max`, etc.) and optional distribution of resources.  

For example, to limit a container to 50 MB RAM and half of a CPU core (in v2) one might do:  
```bash
sudo mount -t cgroup2 none /sys/fs/cgroup
sudo mkdir /sys/fs/cgroup/mycontainer
echo "50000 100000" > /sys/fs/cgroup/mycontainer/cpu.max
echo 50000000 > /sys/fs/cgroup/mycontainer/memory.max
echo <PID> > /sys/fs/cgroup/mycontainer/cgroup.procs
```  
This creates a cgroup at `/sys/fs/cgroup/mycontainer`, sets CPU max to 50-100%, memory max to 50,000,000 bytes, and adds the process ID of interest to it. The process (and its children) will then be limited accordingly. Cgroups are key to preventing a runaway container from exhausting host resources.

 *Figure: Allocating resources to a cgroup (blue) limits its share of CPU, memory, etc., leaving the remainder to other groups/processes.*  

# Preparing a Minimal Root Filesystem  
A container needs its own root filesystem (an isolated `/`). A lightweight approach is to use a **“minirootfs”** from a small distro like Alpine Linux. For example, one can download Alpine’s minirootfs tarball and extract it:
```bash
sudo mkdir -p /container
cd /container
sudo wget https://dl-cdn.alpinelinux.org/alpine/v3.18/releases/x86_64/alpine-minirootfs-3.18.4-x86_64.tar.gz
sudo tar -xzf alpine-minirootfs-3.18.4-x86_64.tar.gz -C .
```
This creates a folder (e.g. `/container/rootfs`) containing the minimal files (bin/, lib/, etc.) needed for Alpine. Inside that, standard directories `/bin`, `/lib`, `/usr`, etc. will exist. 

Once the rootfs is in place, we typically mount a few pseudo-filesystems inside it so that the container can function:
- Mount a new `proc` (unless using `--mount-proc`): `sudo mount -t proc proc /container/rootfs/proc`  
- Mount `sysfs`: `sudo mount -t sysfs sys /container/rootfs/sys`  
- Mount device nodes: either bind-mount `/dev` or use devtmpfs:  
  ```bash
  sudo mount --bind /dev /container/rootfs/dev
  sudo mount -t devpts devpts /container/rootfs/dev/pts
  ```
- (Optional) mount a `tmpfs` on `/container/rootfs/tmp` if needed: `sudo mount -t tmpfs tmpfs /container/rootfs/tmp`.  

These mounts ensure that `/proc`, `/sys`, `/dev`, and other essential parts are available inside the container. Without them, many tools (even `ps`, `mount`, etc.) will not work correctly inside the chroot.

# Step-by-Step: Creating a Container with `unshare` + `chroot`  
With the rootfs ready and mounts in place, we can now **unshare namespaces and chroot** into the container. For example, to create a shell inside an isolated namespace environment:
```bash
sudo unshare --mount --uts --ipc --pid --net --fork --mount-proc chroot /container/rootfs /bin/sh
```
Let’s break down the flags:  
- `--mount` (new mount namespace) – so mounts done inside won’t affect host.  
- `--uts` (new UTS namespace) – gives a separate hostname/domain.  
- `--ipc` (new IPC namespace) – isolates SysV/POSIX IPC.  
- `--pid` (new PID namespace) – isolates process IDs, so that the shell inside gets PID 1 (like init) and can’t see host processes.  
- `--net` (new network namespace) – separates the network stack (we will attach veths to it next).  
- `--fork` – runs the following in a child process, so that PID 1 ends up being our shell.  
- `--mount-proc` – automatically mounts a new `/proc` for the new PID namespace (this implies `--mount`).  
- `chroot /container/rootfs` – changes the root directory to the new rootfs.  
- `/bin/sh` – the command to run inside (the shell).  

After running this, you should get a shell whose prompt might show you’re “root”. Inside this shell, you are in an **isolated container environment**: a new PID 1, a blank hostname, a /proc showing only the shell itself, etc.  For example, inside you might see only two processes (`sh` and `ps` if you run it), whereas on the host there are many more. In other words, this is like a tiny Linux system.

# Setting Hostname and Host Identity  
Inside the new shell, set a hostname so the container identity is clear:
```bash
hostname container1
```
This changes the container’s hostname (visible via `uname -n`). It does not affect the host because we unshared UTS.  

At this point, you have a minimal container shell. You can try simple commands (`whoami` should say root; `ps -ef` should show very few processes). Note that the container’s root user is actually the real root (we did `sudo unshare`), so be careful: this is a privileged container. If you had used `--user --map-root-user`, you could achieve a **rootless container** where root inside is non-root outside, but that’s another topic.

# Adding Networking: veth Pairs, Bridge, and NAT  
By default, the new network namespace has no external connectivity (only a loopback). To connect it, we create a **veth pair** on the host and plug one end into the container’s namespace. For example, in another terminal on the **host** (not inside the container) do:

```bash
# Suppose CONTAINER_PID is the PID of the shell in the container (the host sees it).
CONTAINER_PID=$(pgrep -fu root /bin/sh)

# 1) Create veth pair: one end veth-host, the other veth-cont.
sudo ip link add veth-host type veth peer name veth-cont

# 2) Move the container end into the container's netns.
sudo ip link set veth-cont netns $CONTAINER_PID

# 3) On the host: attach veth-host to a bridge (or use docker0).
sudo ip link set veth-host master br0  # assuming br0 exists

# 4) Bring up the host side.
sudo ip link set veth-host up

# 5) Assign IP to host-side veth (on the bridge network).
sudo ip addr add 192.168.56.1/24 dev veth-host
```

Then, inside the container shell:

```bash
# Inside container namespace (sudo was on host to enter netns):
ip addr add 192.168.56.2/24 dev veth-cont
ip link set veth-cont up
ip link set lo up
```

This gives the host a “bridge” IP 192.168.56.1 and the container a 192.168.56.2. Now the container can ping the host’s veth (and vice versa). To allow the container to reach the outside internet, the host can set up NAT (iptable MASQUERADE) on its physical NIC. For example on the host:

```bash
sudo iptables -t nat -A POSTROUTING -s 192.168.56.0/24 -o eth0 -j MASQUERADE
```

Now containers’ outbound traffic will appear from the host’s IP.  The diagram below illustrates a typical setup:

 *Figure: Docker’s default bridge network uses a Linux bridge (`docker0`, green) to connect each container’s virtual Ethernet interface (`eth0`) to the host. Each container’s `eth0` is one end of a veth pair; the other end (e.g. `vethXYZ`) sits on the bridge. The bridge routes container-to-container traffic and NATs outgoing traffic via the host.*  

With networking in place, the container can ping external IPs (e.g., `ping 8.8.8.8`) and other containers on the same bridge. You can modify firewall rules or use tools like `ip netns exec` to further manage connectivity.

# Applying cgroup Limits to the Container  
To control resources, we assign the container’s processes to a cgroup and set limits. Suppose we want to restrict this container to 50 MB RAM and limit CPU. On the **host**, after mounting cgroup2 (if not already):

```bash
sudo mount -t cgroup2 none /sys/fs/cgroup
sudo mkdir /sys/fs/cgroup/container
echo "50000 100000" | sudo tee /sys/fs/cgroup/container/cpu.max   # 50% - 100%
echo 50000000 | sudo tee /sys/fs/cgroup/container/memory.max       # 50 MB
# Add the container's PID (from host perspective) to the cgroup
echo $CONTAINER_PID | sudo tee /sys/fs/cgroup/container/cgroup.procs
```

Now any process in that namespace (our shell, and processes it spawns) is limited. You can verify usage via `/sys/fs/cgroup/container/*`.

# Automating Container Startup (Example Script)  
You could wrap the above steps in a shell script (a tiny runtime). For example (simplified):

```bash
#!/bin/bash
# 1. Prepare rootfs, mounts (if not done already)
sudo mkdir -p /container/rootfs && cd /container
sudo wget ...alpine-minirootfs-*.tar.gz
sudo tar -xzf alpine-minirootfs-*.tar.gz -C rootfs
sudo mount --bind /dev rootfs/dev
sudo mount -t devpts devpts rootfs/dev/pts
sudo mount --bind /sys rootfs/sys

# 2. Launch container process with new namespaces
sudo unshare --mount --uts --ipc --pid --net --fork --mount-proc \
    chroot rootfs /bin/sh -c "
  hostname ctr1
  exec /bin/sh
"
```

This script (when run) leaves you in a shell inside the new container (with hostname set). One could extend it to set up networking and cgroups automatically. In practice, container runtimes (e.g. runc, Docker) perform these steps programmatically.

# Security Considerations and Mitigations  
A homemade container has no additional security mechanisms beyond what Linux provides natively. Some considerations:  

- **Privileged vs Unprivileged:** The above example uses `sudo unshare`, so the container’s root is actually host root. If a process in the container escapes (e.g. via a kernel exploit), it has full host privileges. To mitigate this, use a **user namespace** so that container UID 0 maps to a non-root host UID. In a user-ns, even if “root” in the container gets out, the kernel treats it as an unprivileged user on the host (e.g. UID 100000), limiting damage.  
- **chroot breaks:** A root user can break out of a chroot jail.  Real container runtimes do a `pivot_root` + remounts which are slightly harder to escape from, but kernel vulnerabilities could still break out if root.  
- **No seccomp by default:** Our simple container has no syscall filtering; a real container runtime often uses seccomp or other Linux security modules (AppArmor, SELinux) to restrict syscalls. Without these, the container can use all syscalls that root normally can.  
- **Shared kernel:** All containers share the host kernel. Any kernel bug (especially in namespaces or cgroups) could compromise all containers and the host. Traditional VMs avoid this by running a separate kernel.  
- **Network attacks:** If the bridge and firewall aren’t configured properly, containers might see host network services or interfere with other containers. Always configure network policies carefully (e.g. using network namespaces and proper IP routing).  
- **User namespace mapping:** If using user namespaces, note that some privileged operations (like mounting certain filesystems) may be restricted unless properly configured.  

Mitigations include running containers with reduced capabilities (e.g. drop `CAP_SYS_ADMIN` inside), using seccomp filters, chroots in mount namespaces, etc. (These are beyond the scope of this guide.) In all cases, remember: a DIY container is not a perfect sandbox. Container runtimes like Docker include additional layers (user namespaces, AppArmor/SELinux profiles, rootless modes, etc.) to harden the environment.

# Comparison: DIY Unshare Container vs Docker/Podman (Containerd)  
| Feature / Aspect             | DIY (`unshare`+`chroot`)             | Docker/Podman (containerd/runc)       |
|:-----------------------------|:-------------------------------------|:--------------------------------------|
| **Isolation setup**         | Manually select namespaces to unshare (mount, pid, net, ipc, uts, possibly user). Requires root (or userns) to unshare. | Automatically creates all necessary namespaces. Rootless mode uses userns. |
| **Rootfs (filesystem)**     | Use any rootfs (e.g. Alpine minirootfs) manually extracted. No layering or snapshots by default. | Uses **images** (read-only layers + overlayfs). Pull from registry; writable layer is auto-mounted. |
| **Commands**                | Uses standard Linux tools (`unshare`, `chroot`, `ip`, `mount`, etc.). | High-level CLI (`docker run`). Underneath: containerd & runc do `unshare()`, `mount`, `pivot_root`, `setns` etc. automatically. |
| **Networking**              | Must manually create veth pairs, bridges, and configure iptables for NAT. | By default, Docker creates a bridge network (`docker0`) and sets up veths and NAT automatically. Simplifies networking for user. |
| **Resource limits (cgroups)** | Manually configure cgroup filesystems and set limits. | Flags (`--memory`, `--cpus`, etc.) automatically configure cgroups under the hood. |
| **Security features**       | No built-in seccomp or dropped capabilities (unless you do it yourself). | Runtimes use default seccomp profiles, AppArmor/SELinux labels, and can run containers with fewer capabilities. |
| **Portability**             | Not portable: the container is tied to the host environment (no easy packaging). | Containers are portable artifacts (images) that can run on any compatible host with Docker/OCI runtime. |
| **Ease of use**             | Educational but low-level and manual. Good for learning, bad for production use. | Very user-friendly: one `docker run` command can start complex containers. |
| **Features & ecosystem**    | Barebones: you only get exactly what you script (no volume management, no service discovery, etc.). | Rich ecosystem: images, registries, orchestration (Kubernetes), plugins, etc. |
| **Isolation scope**         | Exactly what you choose via namespaces/cgroups. If you forget something (e.g. userns), isolation may be weaker. | Follows OCI standards: by default isolates PID, net, IPC, UTS, mount, userns (if enabled), plus seccomp. |
| **Performance**             | Similar runtime overhead (same kernel), but no image caching/overhead. | Similar (shares kernel). Some overhead for overlayfs layers, but negligible in practice. |

Modern container tools essentially automate all the manual `unshare` and mount steps described above, making containers much easier to run. For example, when Docker’s CLI is used, it performs these steps in the background. However, understanding the manual process is invaluable for grasping what actually happens inside a container.

# Troubleshooting Common Issues  
- **“Operation not permitted” with `unshare` or `mount`:** Make sure you have the necessary capabilities. Typically you need to be root (CAP_SYS_ADMIN) to create most namespaces and mount new filesystems. Without a user namespace, only root can `unshare` namespaces.  
- **“chroot: failed to run command: No such file or directory”:** Inside `rootfs`, `/bin/sh` or the specified command must exist and be executable. Also verify you have mounted required libraries (e.g. via `ldd`) in the rootfs.  
- **No `/proc` inside container:** If you forgot `--mount-proc` or mounting proc manually, tools like `ps` will not work. Inside the container shell try `mount -t proc proc /proc`.  
- **Network unreachable:** Check that the veth link is up on both host and container side (`ip link`). Ensure IP addresses and netmask are correct and that the bridge (e.g. `br0`) has the host’s veth attached. Also check your iptables NAT rules if using NAT.  
- **Rootless containers (`--user`):** If unsharing user namespace, mapping root, you may not see contents on host or have permission to bind-mount `/dev`, etc. Use `--map-root-user` or configure `/etc/subuid,/etc/subgid`.  
- **Cgroup mounting errors:** On some systems (like WSL2), you may need to enable cgroup v2 or mount it manually as shown. If `/sys/fs/cgroup` isn’t present, create it and mount.  
- **Processes suddenly exit:** Remember in a PID namespace, if PID 1 exits, all processes in that namespace are killed. Ensure your container’s init (PID 1) stays alive or explicitly runs your main service.  
- **Stuck in container shell:** If you run `unshare` without `--fork`, your shell might not start as PID 1 properly. Use `--fork` or explicitly run a nested shell with `exec`.  

In general, carefully check the kernel logs (dmesg) and error messages. Also compare `/proc/self/status` and `/proc/self/ns/` on host vs container to see what namespaces are active.

# Container Runtime Flow (Mermaid Diagram)  
Below is a high-level flowchart of what a container runtime does (similar to our manual steps):

```mermaid
flowchart TD
    A[Prepare rootfs (e.g. extract Alpine)] --> B[Create namespaces (unshare)]
    B --> C[Mount /proc, /sys, /dev inside new mount ns]
    C --> D[Set hostname and other ns settings]
    D --> E[Configure network (veth pair, bridge, ip)]
    E --> F[Apply cgroup limits (CPU, memory, etc.)]
    F --> G[Exec container’s PID 1 process (chroot and exec)]
```

# Conclusion  
Using `unshare`, `chroot`, and cgroups you can build a native Linux container from scratch. This exercise demystifies how container runtimes like Docker actually work under the hood. The core idea is simple: “**change what the process can see, then control what it can use**.”  Everything else (images, overlays, registries) is user-space tooling to make this convenient. By following the steps above, you will have a minimal containerized environment on Linux, gaining insight into namespaces, `/proc`, networking via veth/bridges, and cgroups.  

**Sources:** Official Linux documentation and tutorials have been used wherever possible. The concepts and commands above are based on kernel behavior (man-pages and kernel docs), as well as high-quality community tutorials.  This guide assumes a modern Linux (kernel ≥4.8, root privileges) on x86_64; adjust versions (e.g. Alpine release) as needed.    
