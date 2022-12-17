# vulkan_bun_helloworld

*vulkan_bun_helloworld* is a [Vulkan](https://www.vulkan.org/) helloworld program that runs in [Bun](https://bun.sh/).

*vulkan_bun_helloworld* uses:
- [*vulkan4bun*](https://github.com/davidmanzanares/vulkan4bun)
- [*glfw4bun*](https://github.com/davidmanzanares/glfw4bun)

Which are bindings generated with [makebindingsforbun](https://github.com/davidmanzanares/makebindingsforbun).

The code is a simplification of the [Vulkan tutorial](https://vulkan-tutorial.com/).

## Running

`
bun install
bun helloworld.ts
`

If everything works you will see a colored static triangle, FPS and logs will be shown in the terminal:

![working example](https://github.com/davidmanzanares/vulkan_bun_helloworld/blob/master/result.png?raw=true)


## Dependencies

*vulkan4bun* and *glfw4bun* are pure javascript libraries that use Bun FFI to dynamically load necessary Vulkan and GLFW symbols. Therefore, the only requirements are:
- Bun
-*vulkan4bun* and *glfw4bun*
- Vulkan loader (vulkan.so.1) in the expected path (`/usr/lib/x86_64-linux-gnu/libvulkan.so.1`)
- A Vulkan-enabling GPU driver

## Limitations

*makebindingsforbun* is experimental, making generated bindings experimental too. Only Linux and the AMD64 arch are supported. Ergonomics could be improved if *makebindingsforbun* generated typescript definitions.

## Why

Apart from because it's fun, Javascript under Bun is probably the fastest runtime for a scripting language. Bun also promises a very low cost on making FFI calls.

Additionally, GPU intensive programs can easily be bottlenecked in the GPU, reducing the real cost of using slower languages than C/C++/Rust. 
