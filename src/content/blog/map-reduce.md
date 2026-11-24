---
title: "Writing a MapReduce tool"
date: "2023-10-12"
tags: ["distributed-systems"]
summary: "A practical walkthrough of building a mini MapReduce runtime, with master-worker coordination and intermediate data handling."
difficulty: "intermediate"
---
## Introduction:
Map reduce has been a core part of Big data processing ever since it was conceived back in 2004 by Google. Google had a growing need for a sort of framework which helped in dealing with large data processing spanning multiple servers. Another Requirement for them is to protect the programmer from the underlying complexity and provide him with a simple interface to perform these processing tasks. So, They created the map-reduce framework inspired by the functional programming concepts of mappers and reducers. In this framework, programmers have to write the map function and the reduce function and call the framework passing in the functions to it, then the framework splits into a map-phase and a reduce phase and uses the map and reduce function respectively in each of those phases. There are several Implementations of map-reduce framework outside of google, one particularly famous one is the Hadoop's map-reduce framework.

I have found it fascinating how much complexity the map-reduce framework hides when i was using it on Hadoop. You just pass in two functions and a result is computed even though the data and the compute resources are spread across on multiple servers. I could feel some big machinery working underneath the framework but did not know how it worked. So a weekend i spent reading the map-reduce white paper and got a *feel* for the underlying concepts but had doubts on the implementation of workers and how does Intermediate Data generation actually work and how to parallelise the processes for minimum runtimes.

So in order to better understand them I thought to build a miniature version of it. Though the version I set out to write works on local file system rather than a distributed file system and does not have the fault tolerant behaviour(of workers crashing), I think I got a good understanding on how map-reduce frameworks work in general and i want talk about my implementation of it. 

## Architecture:
Before looking into the technical details I want to talk about the broader *architecture* so to speak. A diagram for the architecture can be seen as shown below. 

![Architecture mapReduceMini](/images//Map-reduce-arch.excalidraw.png)

On expanding some of the points on the diagram:
1) (Ask for map task) : In The map Phase when the workers ask for tasks from the master, and the master which keeps the track of the Input File System would split up the directory and send the files for each worker to be worked on. The splitting of files is based on the worker count (which is customisable) and number of files in the input file directory
2) (IR data from Map written to disk): After Workers process and run the *map* function on the data and produce IR(Intermediate Representation) data, they create IR files in such a way as to make the reduce workers task simple(more on this implementation details later)
3) (Ask for Reduce Task): During the reduce phase, which is after all the map workers have completed their tasks, the workers ask for task and they would receive the reduce task and the location of the IR files.
4) (Read IR Buckets): The IR data which is in form of buckets are read by the reduce workers and the *reduce* function is applied on them.
5) Finally the data is written to out files whose location is again passed on to the Master(by workers). On these out files another cycle of map-reduce can be performed

Now that the basic architecture is explained, lets look at the underlying details

## Implementation details
The tool is written in go. No particular reason apart from it being the language I am most comfortable in and I do not need to use external libraries because of its powerful standard library. All the communication between the workers and master take place through *RPC* calls. The choice for RPC based communication over channel based communication is because I wanted to simulate the situation as if the workers are running on separate machines(which is how they run in Hadoop and other map-reduce frameworks). 

### Master and Worker structs:
The structures defined for master and worker to represent the kind of tasks that each process is in-charge of.

```go
// Master struct
type Master struct {
	workerFiles  map[int][]string // the files-split for each worker
	phase        Phase
	IRfiles      []string // The IR files locations 
	Worker_Count int
	WorkerStatus map[int]WorkerPhase
	OutFiles     []string // the output files location 
	sync.Mutex // embedded mutex
}

// Worker struct
type Worker struct {
	id           int
	done         chan int // for sending completed signal to main process
	worker_count int
}
```

The `sync.Mutex` that is embedded in Master is to make sure that reads and writes of the workers(which would be running in parallel) on the various data structures could happen without any problems such as *data races*.

The Master struct also has a `Phase` struct in it, this corresponds to the state or phase of the Master. This is used to send the either the map task or reduce task to the worker which is polling for tasks.

### How the worker *works*:
The worker after recieving work will either work on the map part or reduce part(based on the work that master has sent it). For a map task the worker receives the *input split* that it has to work, for the Reduce task it receives the IR Data location. 
#### Map part:
During the map part, the worker reads the values from its *Input split* and runs them through the map function. As the map function emits a key, value pair, we maintain a buffer for all these key value pairs and afterwards we sort them and write them into the IR Data buckets.

Writing into data buckets is has to done in a *organised* way, as this makes the task of our reduce workers simple and efficient. In this implementation, the IR data buckets are written in the format of  `mr-x-y`, where x in the map worker id and y is the reduce worker id. x is straight-forward but to calculate the y, we use a hash function which could uniquely and equally map the keys to each reduce workers. The hash function implemented is as given below:
```go
// use ihash(key) % #outfiles to choose the reduce
// task number for each KeyValue emitted by Map.
func ihash(key string) int {
	h := fnv.New32a()
	h.Write([]byte(key))
	return int(h.Sum32() & 0x7fffffff)
}
```

following this if we have two map workers(as well as two reduce workers) we would get the IR data files to be *mr-1-1, mr-1-2, mr-2-1, mr-2-2*. The location of these files is passed back to the master

#### Reduce Phase:
With the IR data generated from the map phase, each reduce worker reads the IR data based on its worker id, for example  worker 1 would read mr-1-1, mr-2-1 and worker 2 would read mr-1-2, mr-2-2. After reading these files they would apply the reduce function and write the output to a `out-x` file where the x denotes the reduce worker id. The locations of these output files is passed back to the master.


> 	**Note**: what about the shuffling phase?
	if you are familiar with the internals of map-reduce framework, you would be wondering where is the shuffling phase? I have integrated it with the map phase(remember the sort and the hash function).

## Testing the tool!
One of the first way of learning how to use the map-reduce framework is the word-count example. given a set of input files we would want to find the word count of every unique word. 

so for this word count example, the map function would look like this:
```go
func Map(filename string, contents string) []KeyValue {
	// function to detect word separators.
	ff := func(r rune) bool { return !unicode.IsLetter(r) }

	// split contents into an array of words.
	words := strings.FieldsFunc(contents, ff)

	kva := []KeyValue{}
	for _, w := range words {
		kv := KeyValue{w, "1"}
		kva = append(kva, kv)
	}
	return kva
}
```
where it would accept the file name and the contents of the file, and emits key value pairs

The reduce function would look like as such:
```go
func Reduce(key string, values []string) string {
	// return the number of occurrences of this word.
	return strconv.Itoa(len(values))
}
```
Where it would accept the keys (this belong to the same space of the Intermediate keys) and all the values that are emitted for that specific key during the map phase.

so running this implementation of map-reduce on these functions, I was able to generate all the word counts correctly for a set of 8 text files as input. The output in the out files, when sorted and printed is as follows:
```bash
cat out-* | sort | more                                                                                              
A 509
ABOUT 2
ACT 8
ACTRESS 1
ACTUAL 8
ADLER 1
ADVENTURE 12
ADVENTURES 7
## ...and more
```

## Conclusion
While implementing the tool, I had gained much more appreciation for the everyday tools (especially frameworks and libraries) that i use as a developer. I was also able to develop a better understanding of the go concurrency model and *goroutines* as I was experimenting with them a lot to find the best strategy for implementing the communication. Though there is further room for improvement for example adding support for actual distributed file system and running on multiple servers, I have chose not to implement them due to resources contraint(and time constraint). But This was a good first project in my goal to better understand distributed systems.

The Code for the tool can be found [here](https://github.com/JaswanthP6878/MapReduceMini)

---
### References:
- [Map reduce paper](http://nil.csail.mit.edu/6.824/2020/papers/mapreduce.pdf)
- [Go reference](https://pkg.go.dev/)



