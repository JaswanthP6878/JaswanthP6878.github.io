---
title: "Creating a CHIP-8 emulator"
date: "2024-05-25"
tags: ["systems-programming"]
summary: "Implementation notes from building a CHIP-8 emulator, including architecture, opcode execution, and sprite rendering details."
difficulty: "intermediate"
---


## Intro
Emulators have always been part of my childhood. I can remember playing Pokemon emerald(using the ROM file) for countless number of hours on a Emulator. I  have been intrigued about emulators ever since, as a kid I had no idea of how they ran. But through out my computer science degree as I was able to get knowledge about the inner workings of a computers and various systems I had developed a better intuition of the emulators. In this post I want to discuss about journey in building an emulator from scrath and running games on it...


![Space-invaders-chip8](/images/space_invaders.png)

## Why do we need an emulator!?
One of the first questions, I had was "Why do we need an emulator?". We have so many games that ran on pc directly as .exe files but so what was wrong with Pokemon emerald? It is because the game was built for the gameboy advance. The compiled binary(or ROM file) had instruction set and everything in a way to be run on gameboy advance. so to run the game we would either need to have the actual device with all the hardware or some piece of software that would "emulate" the gameboy advance hardware. This is where the emulators come in. They are programs that emulate the actual physical hardware that these game files would need to run and execute the game. I found this quite a fascinating because the typical process involves writing software for a hardware(i mean hardware and the encompassing OS and stuff), But here we are creating hardware for an old software.

with this curiosity, I wanted to build one of my own and understand more of how it works. I have looked at the spec of implementing the gameboy emulator and it seemed quite daunting. so after research I have settled on a more simpler emulator called chip8. 


## Chip-8 Architecture
The Chip-8 architecture is a simple, interpreted programming language primarily designed for programming 8-bit microcomputers in the 1970s. It was created by Joseph Weisbecker for the COSMAC VIP microcomputer, and it has since been implemented on various other platforms. The simplicity of Chip-8 comes from the instruction set that it executes along with the actual hardware that it is meant to emulate. 

The Chip-8 specification requires the use of sixteen 8-bit registers (V0-VF), a 16-bit index register, a 64-byte stack with 8-bit stack pointer, an 8-bit delay timer, an 8-bit sound timer, a 64x32 bit frame buffer, and a 16-bit program counter. The Chip8 specification also supported 4096 bytes of addressable memory. All of the supported programs will start at memory location 0x200


## Implementing the Chip 8 emulator
going through the architecture of chip8 and a few guides I was able to create the chip8 emulator. For this project I have used Rust for the programming language(but the language choice does not matter) as I was in the process of understanding the language. 

The entire emulator architecture can be specified in a struct(c-like struct) and the one I was able to reporduce is as follows:
```rust

pub struct Emu {
    pc: u16, // program_counter
    ram: [u8; RAM_SIZE], // the entire Ram for the emulator
    screen: [bool; SCREEN_HEIGHT*SCREEN_WIDTH], // screen dimensions to draw pixels
    v_reg: [u8; NUM_REGS], // v_registers
    i_reg: u16, // i_reg is used for indexing, reading and writing RAM
    sp: u16, // stack pointer
    stack: [u16; STACK_SIZE],
    keys: [bool; NUM_KEYS],
    dt: u8, // delay timer register
    st: u8, // sound timer register
}
```

This is it. This defines the entire layout of our emulator as specified by the chip8 specification. The next step is to implement the instruction set of the chip8 games. as mentioned earlier, the chip8 specificaition also mentions the various opcodes(or instruction sets) that the ROM file are composed of. The main job of our emulator is to `load, parse and execute the opcode instructions`.

These Opcodes range from moving and adding values in a couple of registers to some complicated ones. one of the more simpler opcode is the `7XNN - VX += NN`, whose purpose is to add value mentioned(using the NN bits) to the register V_x, This (and the other) opcodes can be executed by using the Rust's pattern matching feature.

```rust
  fn execute(&mut self, op: u16){
        let digit1 = (op & 0xF000) >> 12;
        let digit2 = (op & 0x0F00) >> 8;
        let digit3 = (op & 0x00F0) >> 4;
        let digit4 = op & 0x000F;
    // ... 
    // other opcode implementations...
   (7, _, _, _) => {
                let x = digit2 as usize;
                let nn = (op & 0xFF) as u8;
                self.v_reg[x] = self.v_reg[x].wrapping_add(nn);
            }
    //....
    //...
  } 
```

The most complicated of the opcodes would be the `DXYN - Draw Sprite`, so allow me to take a moment to describe how it works in detail. Rather than drawing individual pixels or rectangles to the screen at a time, the Chip-8 display works by drawing sprites, images stored in memory that are copied to the screen at a specified (x, y). For this opcode, the second and third digits give us which V Registers we are to fetch our (x, y) coordinates from. So far so good. Chip-8’s sprites are always 8 pixels wide, but can be a variable number of pixels tall, from 1 to 16. This is specified in the final digit of our opcode. I mentioned earlier that the I Register is used frequently to store an address in memory, and this is the case here; our sprites are stored row by row beginning at the address stored in I. So if we are told to draw a 3px tall sprite, the first row’s data is stored at *I, followed by *I + 1, then *I + 2. This explains why all sprites are 8 pixels wide, each row is assigned a byte, which is 8-bits, one for each pixel, black or white. The last detail to note is that if any pixel is flipped from white to black or vice versa, the VF is set (and cleared otherwise). With these things in mind, the implementation I was able to get to was as follows:

```rust
   (0xD, _, _, _) => { // Draw pixels on screen.
                let x_coord = self.v_reg[digit2 as usize] as u16 ;
                let y_coord = self.v_reg[digit3 as usize] as u16;
                let num_rows = digit4;
                let mut flipped = false;
                for y_line in 0..num_rows {
                    let addr = self.i_reg + y_line as u16;
                    let pixels = self.ram[addr as usize];
                    for x_line in 0..8 {
                        if (pixels & (0b1000_0000 >> x_line)) != 0 {
                            let x = (x_coord + x_line) as usize % SCREEN_WIDTH;
                            let y = (y_coord + y_line) as usize % SCREEN_HEIGHT;
                            let idx = x + SCREEN_WIDTH * y;
                            flipped |= self.screen[idx];
                            self.screen[idx] ^= true;
                        } 
                    }
                }
   }
```
and so as we can implement all the rest of the opcodes from the Chip8 spec. now moving to running the emulator would involve the similar `fetch-decode-execute` cycle of any other computer system. We call this cycle as a "tick", so on integrating with a game-loop(which is similar to normal while loop) and an frontend libraty to handle windowing and capturing of input events. the game loop that is costructed is roughly as follows:
```rust
'gameloop: loop {
        for evt in event_pump.poll_iter() {
            match evt {
                Event::Quit { .. } | Event::KeyDown{keycode: Some(Keycode::Escape), ..}=> {
                    break 'gameloop
                },
                Event::KeyDown{keycode: Some(key), ..} => {
                    if let Some(k) = key2btn(key) {
                        chip8.keypress(k, true);
                    }
                }
                Event::KeyUp{keycode: Some(key), ..} => {
                    if let Some(k) = key2btn(key) {
                        chip8.keypress(k, false);
                    }
                }
                _ => ()
            }
        }
        for _ in 0..TICKS_PER_FRAME {
            chip8.tick(); // here we are running the fetch-decode-execute cycle
        }
        chip8.tick_timers();
        draw_screen(&chip8, &mut canvas); //sdl2 draws the game state to screen
    }
```

This is the majority of the part that is required to create and run a chip8 emulator.

## Conclusion
Through out this project I was able to gain a much deeper understanding about cpu architectures and the fundamentals of emulation software. though parts of it (Especially the SDL2 management) were tough to get through, in the end I was able to make it through and was able to play a few of the chip8 games. One day hopefully I would be able to emulate the gameboy advance too(the tought of reading the design spec is it self quite scary... wait I just remembered, It has audio and color too!!!!)