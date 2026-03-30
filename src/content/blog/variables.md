---
title: "Variables are not boxes.. they are labels"
date: "2026-03-30"
tags: ["systems-programmimng"]
summary: "Thoughts on the common notion that variables are boxes to hold data, rather they are labels"
difficulty: "beginner"
---

## Intro

We hear it a lot in intro programming classes: "variables are boxes in which we store data." It is a decent enough mental model to get started, but it starts causing real confusion once you go deeper into the stack when you are writing systems code, thinking about memory, or trying to make sense of why a language behaves in a way that feels wrong.

I want to make the case that variables are better thought of as *labels*, names attached to memory locations. This is not just a cleaner abstraction. It is what the machine is actually doing.

---

## Python makes it obvious

Python is a good place to start because it does not hide this from you.

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a)  # [1, 2, 3, 4]
```

If variables were boxes, `a` and `b` would be separate containers. Modifying `b` would leave `a` alone. But that is not what happens `a` reflects the change too, because `a` and `b` are both labels pointing at the same list object in memory.

Python gives you a way to see this directly:

```python
a = [1, 2, 3]
b = a
print(id(a))  # e.g. 140234867123456
print(id(b))  # same address
print(a is b) # True
```

`id()` returns the memory address of the object. `a` and `b` have the same address, they are two names for one thing. When you write `b = a`, you are not copying a box. You are sticking a second label on the same location.

This is why Python's `==` and `is` mean different things. `==` compares values. `is` asks: are these two labels pointing at the same address?

```python
x = [1, 2, 3]
y = [1, 2, 3]
print(x == y)  # True  — same value
print(x is y)  # False — different locations, different labels
```

---

## Going deeper: C and raw addresses

In C, the label model is not something you infer it is something you work with directly. A variable name is syntactic sugar for a memory address, and the language gives you tools to inspect and manipulate those addresses.

```c
int x = 10;
printf("%p\n", (void*)&x); // prints the address x labels, e.g. 0x7fff5fbff5ac
```

`&x` is the address that the label `x` refers to. The value `10` lives there. `x` itself is just the name.

A pointer takes this one step further, it is a label whose *value* is itself an address:

```c
int x = 10;
int *p = &x;
printf("%d\n", *p); // 10 — follow the label to the address, read the value
```

`p` is a label for a memory location that holds the address of `x`. There is no box here, just labels pointing at addresses, and addresses pointing at data. Once you see it this way, pointer arithmetic makes sense too: you are just doing math on addresses.

---

## Rust: a language that enforces the label model

With the label model in hand, Rust's ownership system stops being a set of arbitrary rules and starts reading as a coherent policy about labels.

Take this code:

```rust
fn main() {
    let x = String::from("hello");
    let y = x;
    println!("{}", x); // compile error: value used after move
}
```

Box model reaction: "I assigned `x` to `y`, why can't I still use `x`?"

Label model reaction: `String` owns a heap allocation. `x` was the label for that allocation. `let y = x` *moves the label*; `y` is now the name for that memory, and `x` is gone. There is still only one allocation; there can only be one owner. The compiler is not being pedantic. It is telling you what actually happened.

References extend this naturally. A reference is just another label for the same location:

```rust
fn main() {
    let x = String::from("hello");
    let r1 = &x;
    let r2 = &x;
    println!("{} {}", r1, r2); // fine — two labels, one location, read-only
}
```

Multiple read-only labels are safe. The moment you want a mutable reference, a label with write access, Rust requires it to be exclusive. Two labels that can both rewrite the same address simultaneously is a data race. Rust just makes that a compile error instead of a runtime surprise.

---

## All the way down: registers

The label model doesn't stop at high-level variables. At the CPU level, register names like `rax`, `rbx`, and `rsp` are labels the ISA gives to physical storage cells in the register file. When an instruction says `mov rax, 42`, it writes `42` to the cell named `rax`. The name is a label; the cell is the location.

When I built my [CHIP-8 emulator](https://github.com/JaswanthP6878/chip8-emulator), this was the entire model. CHIP-8 has 16 general-purpose registers named `V0` through `VF`-16 labels for 16 one-byte slots in an array. The program counter `PC` is a label for the current instruction address. The index register `I` is a label for a memory address used by load and draw instructions. Everything is labels pointing into a flat memory space. There are no boxes anywhere in the stack.

---

## Closing

The "variables as boxes" model is a useful starting point. But it is a simplification that breaks at exactly the moments when clarity matters most, when you are debugging a mutation you didn't expect, reasoning about pointers, or trying to understand why a language will not let you do something.

The label model is not more advanced. It is more accurate. Variables are names for memory locations. Once that clicks, a lot of things that seemed like language quirks start to feel inevitable, including Rust's borrow checker, which is really just the compiler making sure your labels don't lie.
