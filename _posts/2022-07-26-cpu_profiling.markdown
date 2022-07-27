---
layout: post
title:  "python CPU profiling"
date:   2022-07-26 16:00:56 +0500
categories: python
---

#### CPU profiling in `python`
---
##### using `cProfile` cli command

```cmd
    python -m cProfile code.py
```

##### using `cProfile.run` method

```python
    from time import sleep

    if __name__ == '__main__':
        import cProfile
        cProfile.run('sleep(1)', filename='result.out')
```

##### using `pstat` to see the result

```cmd
    python -m pstat result.out
```

##### Output:

> Welcome to the profile statistics browser. \
> code.out%

##### sort by total time

```cmd
    sort tottime
```

##### top 3 position in statistic

```cmd
    stats 3
 ```
 
 ##### Output:

> code.out% stats 3 \
> Wed Jul 27 08:47:41 2022    code.out
>
> 15 function calls (14 primitive calls) in 1.003 seconds
>
>   Ordered by: internal time \
>   List reduced from 12 to 3 due to restriction <3> \
>  ncalls  tottime  percall  cumtime  percall filename:lineno(function) 5 \
> 1    1.002    1.002    1.002    1.002 {built-in method time.sleep} \
> 1    0.000    0.000    1.003    1.003 {built-in method builtins.exec} \
> 1    0.000    0.000    1.002    1.002 <string>:1(<module>)

---
#### using pysnooper

##### installation

```cmd
    pip3 install pysnooper
 ```

##### example

```python
import pysnooper

@pysnooper.snoop()
def test(number: int):
    sum = 0
    for i in range(number):
        sum += i
    return sum

if __name__ == '__main__':
    test(1) 
 ```
##### Output:

<img src="{{site.url}}/assets/jpeg/pysnooper.jpeg" width="600px">