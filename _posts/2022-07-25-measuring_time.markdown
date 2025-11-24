---
layout: post
title:  "python time measuring"
date:   2022-07-25 22:00:56 +0500
categories: python
---

#### Measuring time in `python`
---
##### 1) time module

##### using `perf_counter` method

```python
    from time import perf_counter, sleep

    if __name__ == '__main__':
        start_time = perf_counter()
        sleep(1)
        duration = perf_counter() - start_time
        print('duration time =', duration)
```

>  duration time = 1.004974456

##### 2) using `timeit` method

```python
    from timeit import timeit

    if __name__ == '__main__':
        print('duration time =', timeit('sleep(1)', 'from time import sleep', number=3))
```

>  time= 3.010448098

###### `number` parameter using to repeat code
---