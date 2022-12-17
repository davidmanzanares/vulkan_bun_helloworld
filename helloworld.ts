import {
  glfwCreateWindow,
  glfwCreateWindowSurface,
  glfwGetRequiredInstanceExtensions,
  glfwInit,
  glfwPollEvents,
  glfwWindowHint,
  glfwWindowShouldClose,
  GLFW_CLIENT_API,
  GLFW_NO_API,
} from "glfw4bun";
import {
  vkCreateDevice,
  vkCreateInstance,
  vkEnumeratePhysicalDevices,
  vkGetDeviceQueue,
  vkGetPhysicalDeviceProperties,
  vkGetPhysicalDeviceQueueFamilyProperties,
  vkGetPhysicalDeviceSurfaceSupportKHR,
  VkPhysicalDeviceProperties_from_C,
  VkPhysicalDeviceProperties_to_C,
  VkPhysicalDeviceType,
  VkQueueFamilyProperties_alloc_array,
  VkQueueFamilyProperties_from_C,
  vkCreateSwapchainKHR,
  VkQueueFlagBits,
  VkResult,
  VkStructureType,
  VkFormat,
  VkColorSpaceKHR,
  VkImageUsageFlagBits,
  VkSharingMode,
  VkSurfaceTransformFlagBitsKHR,
  VkCompositeAlphaFlagBitsKHR,
  VkPresentModeKHR,
  vkGetSwapchainImagesKHR,
  vkCreateImageView,
  VkImageViewType,
  VkComponentSwizzle,
  VkImageAspectFlagBits,
  vkCreateShaderModule,
  vkCreatePipelineLayout,
  vkCreateRenderPass,
  VkSampleCountFlagBits,
  VkAttachmentLoadOp,
  VkAttachmentStoreOp,
  VkImageLayout,
  VkPipelineBindPoint,
  VkPipelineStageFlagBits,
  VkAccessFlagBits,
  vkCreateGraphicsPipelines,
  VkShaderStageFlagBits,
  VkPrimitiveTopology,
  VkPolygonMode,
  VkCullModeFlagBits,
  VkFrontFace,
  VkLogicOp,
  VkColorComponentFlagBits,
  VkDynamicState,
  vkCreateFramebuffer,
  vkCreateCommandPool,
  VkCommandPoolCreateFlagBits,
  vkAllocateCommandBuffers,
  VkCommandBufferLevel,
  vkCreateSemaphore,
  vkCreateFence,
  VkFenceCreateFlagBits,
  vkWaitForFences,
  vkResetFences,
  vkAcquireNextImageKHR,
  vkResetCommandBuffer,
  vkBeginCommandBuffer,
  vkCmdBeginRenderPass,
  VkSubpassContents,
  vkCmdBindPipeline,
  vkCmdSetViewport,
  vkCmdSetScissor,
  vkCmdDraw,
  vkCmdEndRenderPass,
  vkEndCommandBuffer,
  vkQueueSubmit,
  vkQueuePresentKHR,
  VK_SUBPASS_EXTERNAL,
} from "vulkan4bun";
import { ptr, CString, read } from "bun:ffi";
import fs from "fs/promises";

const WINDOW_WIDTH = 512;
const WINDOW_HEIGHT = 512;

async function main() {
  if (!glfwInit()) {
    throw new Error("GLFW initialization failed");
  }
  glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
  const window = glfwCreateWindow(
    WINDOW_WIDTH,
    WINDOW_HEIGHT,
    ptr(Buffer.from("BunGLFW\0", "utf8").buffer),
    null,
    null
  );

  const glfwExtensionCount = new Uint8Array(4);
  const glfwExtensionsPtr = glfwGetRequiredInstanceExtensions(
    ptr(glfwExtensionCount)
  );
  const glfwExtensions = [];
  for (let i = 0; i < glfwExtensionCount[0]; i++) {
    glfwExtensions.push(new CString(read.ptr(glfwExtensionsPtr + i * 8)));
  }
  console.log("extensions", glfwExtensions, glfwExtensionCount);

  const instancePtr = createHandles().ptr;
  const r = vkCreateInstance(
    {
      sType: VkStructureType.VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
      pNext: 0,
      flags: 0,
      pApplicationInfo: {
        sType: VkStructureType.VK_STRUCTURE_TYPE_APPLICATION_INFO,
        pNext: 0,
        pApplicationName: ptr(Buffer.from("BunGLFW\0", "utf8").buffer),
        applicationVersion: 0,
        pEngineName: ptr(Buffer.from("BunGLFW\0", "utf8").buffer),
        engineVersion: 0,
        apiVersion: 0,
      },
      enabledLayerCount: 1,
      ppEnabledLayerNames: createArrayOfStrings(["VK_LAYER_KHRONOS_validation"])
        .ptr,
      enabledExtensionCount: 2,
      ppEnabledExtensionNames: glfwExtensionsPtr,
    },
    null,
    instancePtr
  );
  console.log("vkCreateInstance", VkResult.keys[r]);

  const surfacePtr = createHandles().ptr;
  glfwCreateWindowSurface(read.u64(instancePtr), window, null, surfacePtr);

  const gpuCount = new Uint8Array(32);
  const ptrGPUcount = ptr(gpuCount);
  console.log("GPU count", ptrGPUcount.toString(16), gpuCount);
  let ret = vkEnumeratePhysicalDevices(read.u64(instancePtr), ptrGPUcount, null);
  const numPhysicalDevices = gpuCount[0];
  console.log(
    "vkEnumeratePhysicalDevices",
    VkResult.keys[ret],
    numPhysicalDevices
  );

  const phyDevices = createHandles(numPhysicalDevices);
  ret = vkEnumeratePhysicalDevices(
    read.u64(instancePtr),
    ptrGPUcount,
    phyDevices.ptr
  );
  console.log("vkEnumeratePhysicalDevices", VkResult.keys[ret]);

  let mainDevice;
  for (let i = 0; i < numPhysicalDevices; i++) {
    const deviceProperties = VkPhysicalDeviceProperties_to_C({}).ptr;
    vkGetPhysicalDeviceProperties(
      read.u64(phyDevices.ptr + 8 * i),
      deviceProperties
    );
    const props = VkPhysicalDeviceProperties_from_C(deviceProperties);
    console.log("VkPhysicalDeviceProperties_from_C", props);
    if (
      props.deviceType ==
      VkPhysicalDeviceType.VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU
    ) {
      mainDevice = read.u64(phyDevices.ptr + 8 * i);
      console.log("mainDevice", i);
    }
  }
  phyDevices.free();

  const queueCountWrapped = createArrayU32();
  vkGetPhysicalDeviceQueueFamilyProperties(
    mainDevice,
    queueCountWrapped.ptr,
    null
  );
  console.log(
    "vkGetPhysicalDeviceQueueFamilyProperties",
    read.u32(queueCountWrapped.ptr)
  );

  const queueProperties = VkQueueFamilyProperties_alloc_array(
    read.u32(queueCountWrapped.ptr)
  );
  vkGetPhysicalDeviceQueueFamilyProperties(
    mainDevice,
    queueCountWrapped.ptr,
    queueProperties
  );
  let mainQueueIndex = -1;
  for (let i = 0; i < read.u32(queueCountWrapped.ptr); i++) {
    const props = VkQueueFamilyProperties_from_C(queueProperties + 8 * i);
    console.log("vkGetPhysicalDeviceQueueFamilyProperties", i, props);
    const surfaceSupport = createHandles();
    vkGetPhysicalDeviceSurfaceSupportKHR(
      mainDevice,
      i,
      read.u64(surfacePtr),
      surfaceSupport.ptr
    );
    const supportsSurface = read.u32(surfaceSupport.ptr) == 1;
    surfaceSupport.free();
    console.log("vkGetPhysicalDevice.ptrKHR", supportsSurface);

    const supportsCompute =
      (props.queueFlags & VkQueueFlagBits.VK_QUEUE_COMPUTE_BIT) != 0;
    const supportsGraphics =
      (props.queueFlags & VkQueueFlagBits.VK_QUEUE_GRAPHICS_BIT) != 0;
    if (supportsCompute && supportsGraphics && supportsSurface) {
      mainQueueIndex = i;
    }
  }
  console.log("mainQueueIndex", mainQueueIndex);

  const priorities = new ArrayBuffer(4);
  let view = new DataView(priorities);
  view.setFloat32(0, 1, true);

  const extensionNameList = createArrayOfStrings(["VK_KHR_swapchain"]).ptr;
  const logicalDeviceCreateInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
    queueCreateInfoCount: 1,
    pQueueCreateInfos: {
      sType: VkStructureType.VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
      queueFamilyIndex: mainQueueIndex,
      queueCount: 1,
      pQueuePriorities: ptr(priorities),
    },
    enabledExtensionCount: 1,
    ppEnabledExtensionNames: extensionNameList,
  };
  const logicalDevicePtr = createHandles();
  ret = vkCreateDevice(
    mainDevice,
    logicalDeviceCreateInfo,
    null,
    logicalDevicePtr.ptr
  );
  const logicalDevice = read.u64(logicalDevicePtr.ptr);

  logicalDevicePtr.free();

  // Get main queue
  const mainQueuePtr = createHandles();

  vkGetDeviceQueue(logicalDevice, mainQueueIndex, 0, mainQueuePtr.ptr);
  const mainQueue = read.u64(mainQueuePtr.ptr);
  mainQueuePtr.free();

  // Creating the swap chain VK_PRESENT_MODE_FIFO_KHR
  let vsync = false;
  const swapchainPtr = createHandles();
  const swawpchainCreateInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR,
    surface: read.u64(surfacePtr),
    minImageCount: 2,
    imageFormat: VkFormat.VK_FORMAT_B8G8R8A8_SRGB,
    imageColorSpace: VkColorSpaceKHR.VK_COLORSPACE_SRGB_NONLINEAR_KHR,
    imageExtent: {
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
    },
    imageArrayLayers: 1,
    imageUsage: VkImageUsageFlagBits.VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT,
    imageSharingMode: VkSharingMode.VK_SHARING_MODE_EXCLUSIVE,
    preTransform:
      VkSurfaceTransformFlagBitsKHR.VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR,
    compositeAlpha:
      VkCompositeAlphaFlagBitsKHR.VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR,
    presentMode: vsync
      ? VkPresentModeKHR.VK_PRESENT_MODE_FIFO_KHR
      : VkPresentModeKHR.VK_PRESENT_MODE_IMMEDIATE_KHR,
  };
  ret = vkCreateSwapchainKHR(
    logicalDevice,
    swawpchainCreateInfo,
    null,
    swapchainPtr.ptr
  );
  console.log("vkCreateSwapchainKHR", VkResult.keys[ret]);

  // Get swap chain image
  const imageCountWrapped = createArrayU32();
  ret = vkGetSwapchainImagesKHR(
    logicalDevice,
    read.u64(swapchainPtr.ptr),
    imageCountWrapped.ptr,
    null
  );
  const imageCount = read.u32(imageCountWrapped.ptr);
  console.log("vkGetSwapchainImagesKHR", VkResult.keys[ret], imageCount);

  const imagesPtr = createHandles(imageCount);
  ret = vkGetSwapchainImagesKHR(
    logicalDevice,
    read.u64(swapchainPtr.ptr),
    imageCountWrapped.ptr,
    imagesPtr.ptr
  );
  console.log("vkGetSwapchainImagesKHR", VkResult.keys[ret]);

  // Get image view
  const imageViewsPtr = createHandles(imageCount);
  for (let i = 0; i < imageCount; i++) {
    const info = {
      sType: VkStructureType.VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO,
      image: read.u64(imagesPtr.ptr + 8 * i),
      viewType: VkImageViewType.VK_IMAGE_VIEW_TYPE_2D,
      format: VkFormat.VK_FORMAT_B8G8R8A8_SRGB,
      components: {
        r: VkComponentSwizzle.VK_COMPONENT_SWIZZLE_IDENTITY,
        g: VkComponentSwizzle.VK_COMPONENT_SWIZZLE_IDENTITY,
        b: VkComponentSwizzle.VK_COMPONENT_SWIZZLE_IDENTITY,
        a: VkComponentSwizzle.VK_COMPONENT_SWIZZLE_IDENTITY,
      },
      subresourceRange: {
        aspectMask: VkImageAspectFlagBits.VK_IMAGE_ASPECT_COLOR_BIT,
        baseMipLevel: 0,
        levelCount: 1,
        baseArrayLayer: 0,
        layerCount: 1,
      },
    };
    ret = vkCreateImageView(
      logicalDevice,
      info,
      null,
      imageViewsPtr.ptr + 8 * i
    );
    console.log("vkCreateImageView", i, VkResult.keys[ret]);
  }

  // https://vulkan-tutorial.com/Drawing_a_triangle/Graphics_pipeline_basics/Shader_modules
  const vertexSPV = await fs.readFile("./helloworld_vert.spv");

  const vertexShaderModulePtr = createHandles();
  const vertexCreateInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO,
    codeSize: vertexSPV.length,
    pCode: ptr(Buffer.concat([vertexSPV, Buffer.alloc(4)]).buffer), // Vulkan requires 4byte padding, ensure by adding 4 bytes to the end
  };
  ret = vkCreateShaderModule(
    logicalDevice,
    vertexCreateInfo,
    null,
    vertexShaderModulePtr.ptr
  );
  console.log("vkCreateShaderModule vertex", VkResult.keys[ret]);

  const fragSPV = await fs.readFile("./helloworld_frag.spv");

  const fragShaderModule = createHandles();
  const fragCreateInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO,
    codeSize: fragSPV.length,
    pCode: ptr(Buffer.concat([fragSPV, Buffer.alloc(4)]).buffer), // Vulkan requires 4byte padding, ensure by adding 4 bytes to the end
  };
  ret = vkCreateShaderModule(
    logicalDevice,
    fragCreateInfo,
    null,
    fragShaderModule.ptr
  );
  console.log("vkCreateShaderModule frag", VkResult.keys[ret]);

  // https://vulkan-tutorial.com/Drawing_a_triangle/Graphics_pipeline_basics/Fixed_functions

  const pipelineLayoutPtr = createHandles(1);
  const pipelineInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO,
  };
  ret = vkCreatePipelineLayout(
    logicalDevice,
    pipelineInfo,
    null,
    pipelineLayoutPtr.ptr
  );
  console.log("vkCreatePipelineLayout", VkResult.keys[ret]);

  // https://vulkan-tutorial.com/Drawing_a_triangle/Graphics_pipeline_basics/Render_passes

  const renderPassPtr = createHandles();
  const renderPassInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO,
    attachmentCount: 1,
    pAttachments: {
      format: VkFormat.VK_FORMAT_B8G8R8A8_SRGB,
      samples: VkSampleCountFlagBits.VK_SAMPLE_COUNT_1_BIT,
      loadOp: VkAttachmentLoadOp.VK_ATTACHMENT_LOAD_OP_CLEAR,
      storeOp: VkAttachmentStoreOp.VK_ATTACHMENT_STORE_OP_STORE,
      stencilLoadOp: VkAttachmentStoreOp.VK_ATTACHMENT_STORE_OP_DONT_CARE,
      stencilStoreOp: VkAttachmentStoreOp.VK_ATTACHMENT_STORE_OP_DONT_CARE,
      initialLayout: VkImageLayout.VK_IMAGE_LAYOUT_UNDEFINED,
      finalLayout: VkImageLayout.VK_IMAGE_LAYOUT_PRESENT_SRC_KHR,
    },
    subpassCount: 1,
    pSubpasses: {
      pipelineBindPoint: VkPipelineBindPoint.VK_PIPELINE_BIND_POINT_GRAPHICS,
      colorAttachmentCount: 1,
      pColorAttachments: {
        attachment: 0,
        layout: VkImageLayout.VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL,
      },
    },
    dependencyCount: 1,
    pDependencies: {
      srcSubpass: VK_SUBPASS_EXTERNAL,
      srcStageMask:
        VkPipelineStageFlagBits.VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
      dstStageMask:
        VkPipelineStageFlagBits.VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
      dstAccessMask: VkAccessFlagBits.VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
    },
  };
  ret = vkCreateRenderPass(
    logicalDevice,
    renderPassInfo,
    null,
    renderPassPtr.ptr
  );
  console.log("vkCreateRenderPass", VkResult.keys[ret]);

  // https://vulkan-tutorial.com/Drawing_a_triangle/Graphics_pipeline_basics/Conclusion

  const dynamicStatesArray = new Uint32Array(2);
  dynamicStatesArray[0] = VkDynamicState.VK_DYNAMIC_STATE_VIEWPORT;
  dynamicStatesArray[1] = VkDynamicState.VK_DYNAMIC_STATE_SCISSOR;

  const pipelinePtr = createHandles();
  const graphicsInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO,
    stageCount: 2,
    pStages: [
      {
        sType:
          VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
        stage: VkShaderStageFlagBits.VK_SHADER_STAGE_VERTEX_BIT,
        module: read.u64(vertexShaderModulePtr.ptr),
        pName: ptr(Buffer.from("main\0", "utf8").buffer),
      },
      {
        sType:
          VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
        stage: VkShaderStageFlagBits.VK_SHADER_STAGE_FRAGMENT_BIT,
        module: read.u64(fragShaderModule.ptr),
        pName: ptr(Buffer.from("main\0", "utf8").buffer),
      },
    ],
    pVertexInputState: {
      sType:
        VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO,
    },
    pInputAssemblyState: {
      sType:
        VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO,
      topology: VkPrimitiveTopology.VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST,
    },
    pViewportState: {
      sType:
        VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO,
      viewportCount: 1,
      scissorCount: 1,
    },
    pRasterizationState: {
      sType:
        VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO,
      polygonMode: VkPolygonMode.VK_POLYGON_MODE_FILL,
      lineWidth: 1,
      cullMode: VkCullModeFlagBits.VK_CULL_MODE_BACK_BIT,
      frontFace: VkFrontFace.VK_FRONT_FACE_CLOCKWISE,
      depthBiasClamp: 0,
    },
    pMultisampleState: {
      sType:
        VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO,
      rasterizationSamples: VkSampleCountFlagBits.VK_SAMPLE_COUNT_1_BIT,
      minSampleShading: 1,
    },
    pColorBlendState: {
      sType:
        VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO,
      logicOp: VkLogicOp.VK_LOGIC_OP_COPY,
      attachmentCount: 1,
      pAttachments: {
        colorWriteMask:
          VkColorComponentFlagBits.VK_COLOR_COMPONENT_R_BIT |
          VkColorComponentFlagBits.VK_COLOR_COMPONENT_G_BIT |
          VkColorComponentFlagBits.VK_COLOR_COMPONENT_B_BIT |
          VkColorComponentFlagBits.VK_COLOR_COMPONENT_A_BIT,
      },
    },
    pDynamicState: {
      sType:
        VkStructureType.VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO,
      dynamicStateCount: 2,
      pDynamicStates: ptr(dynamicStatesArray),
    },
    layout: read.u64(pipelineLayoutPtr.ptr),
    renderPass: read.u64(renderPassPtr.ptr),
    subpass: 0,
    basePipelineIndex: -1,
  };

  ret = vkCreateGraphicsPipelines(
    logicalDevice,
    0,
    1,
    graphicsInfo,
    null,
    pipelinePtr.ptr
  );
  console.log("vkCreateGraphicsPipelines", VkResult.keys[ret]);

  // https://vulkan-tutorial.com/Drawing_a_triangle/Drawing/Framebuffers
  const framebufferPtr = createHandles(imageCount);
  for (let i = 0; i < imageCount; i++) {
    const fbInfo = {
      sType: VkStructureType.VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO,
      renderPass: read.u64(renderPassPtr.ptr),
      attachmentCount: 1,
      pAttachments: imageViewsPtr.ptr + 8 * i,
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
      layers: 1,
    };
    ret = vkCreateFramebuffer(
      logicalDevice,
      fbInfo,
      null,
      framebufferPtr.ptr + 8 * i
    );
    console.log("vkCreateFramebuffer", i, VkResult.keys[ret]);
  }

  // https://vulkan-tutorial.com/Drawing_a_triangle/Drawing/Command_buffers
  const poolPtr = createHandles();
  const poolInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
    flags:
      VkCommandPoolCreateFlagBits.VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
    queueFamilyIndex: mainQueueIndex,
  };
  ret = vkCreateCommandPool(logicalDevice, poolInfo, null, poolPtr.ptr);
  console.log("vkCreateCommandPool", VkResult.keys[ret]);

  const cmdBufferPtr = createHandles();
  const cmdAlloc = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
    commandPool: read.u64(poolPtr.ptr),
    level: VkCommandBufferLevel.VK_COMMAND_BUFFER_LEVEL_PRIMARY,
    commandBufferCount: 1,
  };
  ret = vkAllocateCommandBuffers(logicalDevice, cmdAlloc, cmdBufferPtr.ptr);
  console.log("vkAllocateCommandBuffers", VkResult.keys[ret]);
  poolPtr.free();

  // https://vulkan-tutorial.com/Drawing_a_triangle/Drawing/Rendering_and_presentation
  const semInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO,
  };
  const imageAvailableSemaphorePtr = createHandles();
  ret = vkCreateSemaphore(
    logicalDevice,
    semInfo,
    null,
    imageAvailableSemaphorePtr.ptr
  );
  console.log("vkCreateSemaphore imageAvailableSemaphore", VkResult.keys[ret]);

  const renderFinishedSemaphorePtr = createHandles();
  ret = vkCreateSemaphore(
    logicalDevice,
    semInfo,
    null,
    renderFinishedSemaphorePtr.ptr
  );
  console.log("vkCreateSemaphore renderFinishedSemaphore", VkResult.keys[ret]);

  const fencePtr = createHandles();
  const fenceInfo = {
    sType: VkStructureType.VK_STRUCTURE_TYPE_FENCE_CREATE_INFO,
    flags: VkFenceCreateFlagBits.VK_FENCE_CREATE_SIGNALED_BIT,
  };
  ret = vkCreateFence(logicalDevice, fenceInfo, null, fencePtr.ptr);
  console.log("vkCreateFence", VkResult.keys[ret]);

  const cmdBuffer = read.u64(cmdBufferPtr.ptr);
  let lastFrame = performance.now();

  while (true) {
    glfwPollEvents();
    if (glfwWindowShouldClose(window)) {
      return;
    }
    vkWaitForFences(logicalDevice, 1, fencePtr.ptr, 1, Number.MAX_SAFE_INTEGER);
    vkResetFences(logicalDevice, 1, fencePtr.ptr);

    const now = performance.now();
    const dt = now - lastFrame;
    lastFrame = now;
    console.log(1 / (dt / 1000), "fps");
    const imageIndexWrapped = createArrayU32();
    ret = vkAcquireNextImageKHR(
      logicalDevice,
      read.u64(swapchainPtr.ptr),
      Number.MAX_SAFE_INTEGER,
      read.u64(imageAvailableSemaphorePtr.ptr),
      0n,
      imageIndexWrapped.ptr
    );
    imageIndexWrapped.free();
    console.log("vkAcquireNextImageKHR", VkResult.keys[ret]);

    vkResetCommandBuffer(cmdBuffer, 0);
    const beginInfo = {
      sType: VkStructureType.VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
    };
    ret = vkBeginCommandBuffer(cmdBuffer, beginInfo);
    console.log("vkBeginCommandBuffer", VkResult.keys[ret]);
    const renderBeginInfo = {
      sType: VkStructureType.VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO,
      renderPass: read.u64(renderPassPtr.ptr),
      framebuffer: read.u64(
        framebufferPtr.ptr + 8 * read.u32(imageIndexWrapped.ptr)
      ),
      renderArea: {
        extent: {
          width: WINDOW_WIDTH,
          height: WINDOW_HEIGHT,
        },
      },
      clearValueCount: 1,
      pClearValues: ptr(new ArrayBuffer(32)),
    };
    vkCmdBeginRenderPass(
      cmdBuffer,
      renderBeginInfo,
      VkSubpassContents.VK_SUBPASS_CONTENTS_INLINE
    );

    vkCmdBindPipeline(
      cmdBuffer,
      VkPipelineBindPoint.VK_PIPELINE_BIND_POINT_GRAPHICS,
      read.u64(pipelinePtr.ptr)
    );
    const viewport = {
      x: 0,
      y: 0,
      width: WINDOW_WIDTH,
      height: WINDOW_HEIGHT,
      minDepth: 0,
      maxDepth: 1,
    };
    vkCmdSetViewport(cmdBuffer, 0, 1, viewport);
    const scissor = {
      extent: {
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
      },
    };
    vkCmdSetScissor(cmdBuffer, 0, 1, scissor);
    vkCmdDraw(cmdBuffer, 3, 1, 0, 0);
    vkCmdEndRenderPass(cmdBuffer);
    ret = vkEndCommandBuffer(cmdBuffer);
    console.log("vkEndCommandBuffer", VkResult.keys[ret]);

    const pWaitDstStageMask = new Uint32Array(1);
    pWaitDstStageMask[0] =
      VkPipelineStageFlagBits.VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    const submitInfo = {
      sType: VkStructureType.VK_STRUCTURE_TYPE_SUBMIT_INFO,
      waitSemaphoreCount: 1,
      pWaitSemaphores: imageAvailableSemaphorePtr.ptr,
      pWaitDstStageMask: ptr(pWaitDstStageMask),
      commandBufferCount: 1,
      pCommandBuffers: cmdBufferPtr.ptr,
      signalSemaphoreCount: 1,
      pSignalSemaphores: renderFinishedSemaphorePtr.ptr,
    };
    ret = vkQueueSubmit(mainQueue, 1, submitInfo, read.u64(fencePtr.ptr));
    console.log("vkQueueSubmit", VkResult.keys[ret]);

    const imageIndices = new Uint32Array(1);
    imageIndices[0] = read.u32(imageIndexWrapped.ptr);
    const presentInfo = {
      sType: VkStructureType.VK_STRUCTURE_TYPE_PRESENT_INFO_KHR,
      waitSemaphoreCount: 1,
      pWaitSemaphores: renderFinishedSemaphorePtr.ptr,
      pSwapchains: swapchainPtr.ptr,
      swapchainCount: 1,
      pImageIndices: ptr(imageIndices),
    };
    vkQueuePresentKHR(mainQueue, presentInfo);
    console.log(globalThis.ptrBufferRefs.size);
  }
}

function createHandles(size = 1) {
  const buffer = new ArrayBuffer(8 * size);
  globalThis.ptrBufferRefs.add(buffer);
  return {
    ptr: ptr(buffer),
    free: () => globalThis.ptrBufferRefs.delete(buffer),
  };
}

function createArrayU32(size = 1) {
  const buffer = new ArrayBuffer(4 * size);
  globalThis.ptrBufferRefs.add(buffer);
  return {
    ptr: ptr(buffer),
    free: () => globalThis.ptrBufferRefs.delete(buffer),
  };
}

function createArrayOfStrings(list: string[]) {
  const stringBuffers = list.map((str) => Buffer.from(str + "\0", "utf8"));
  const array = new ArrayBuffer(8 * list.length);
  const view = new DataView(array);
  stringBuffers.forEach((buffer, i) => {
    view.setBigUint64(8 * i, BigInt(ptr(buffer.buffer)), true);
  });
  globalThis.ptrBufferRefs.add(array);
  globalThis.ptrBufferRefs.add(stringBuffers);
  return {
    ptr: ptr(array),
    free: () =>
      globalThis.ptrBufferRefs.delete(array) &&
      globalThis.ptrBufferRefs.delete(stringBuffers),
  };
}

async function entry() {
  try {
    await main();
  } catch (error) {
    console.error(error);
  }
}

entry();
