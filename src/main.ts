import "./style.css"

/*
Base navigation
Character navigation?? - no
Images
Links
Inputs
Quick Jumps (headings, links - need labels)

Screen readers prefer the oxford comma!
*/

const GLOBAL_SETTINGS = {
  rate: 1,
}

let currentActive: ReturnType<typeof handleFrame> | null = null

function instrument(element: HTMLDivElement): void {
  const stopAudioButton = element.querySelector(
    ".stop-audio"
  )! as HTMLButtonElement

  element.querySelector(".exit")!.addEventListener("click", () => stop())
  const showHidePage = element.querySelector(".show-hide-page")!
  showHidePage.addEventListener("click", () => togglePageVisibility())
  // const showHideCode = element.querySelector(".show-hide-code")!
  // showHideCode.addEventListener("click", () => toggleCodeVisibility())

  element
    .querySelector(".stop-audio")!
    .addEventListener("click", () => stopAudio())

  const frame = handleFrame(element, {
    updateFrameState: (speaking: boolean) => {
      stopAudioButton.querySelector("span")!.textContent = speaking
        ? "Stop Audio"
        : "Speak Element"
    },
    // updateCodeShown: (codeShown) => {
    //   showHideCode.children[0].textContent = codeShown
    //     ? "Hide Code"
    //     : "Show Code"
    // },
    updatePageShown: (pageShown) => {
      showHidePage.children[0].textContent = pageShown
        ? "Hide Page"
        : "Show Page"
    },
  })

  const {
    activate,
    stop,
    next,
    prev,
    stopAudio,
    faster,
    slower,
    getCurrentStatus,
    togglePageVisibility,
    headerRotor,
    linkRotor,
    openLink,
    // toggleCodeVisibility,
  } = frame

  element.addEventListener("keydown", (e) => {
    if (getCurrentStatus() !== "active") return
    switch (e.key) {
      case "Escape":
        stop()
        break
      case "ArrowDown":
        next()
        e.preventDefault()
        return false
      case "ArrowUp":
        prev()
        e.preventDefault()
        return false
      case ",":
        slower()
        e.preventDefault()
        break
      case ".":
        faster()
        e.preventDefault()
        break
      case "ArrowRight":
        if (e.shiftKey) {
          faster()
          e.preventDefault()
        }
        break
      case "ArrowLeft":
        if (e.shiftKey) {
          slower()
          e.preventDefault()
        }
        e.preventDefault()
        break
      case "Control":
        stopAudio()
        e.preventDefault()
        break
      case "h":
        headerRotor("forward")
        e.preventDefault()
        break
      case "H":
        headerRotor("back")
        e.preventDefault()
        break
      case "l":
        linkRotor("forward")
        e.preventDefault()
        break
      case "L":
        linkRotor("back")
        e.preventDefault()
        break
      case "p":
        togglePageVisibility()
        e.preventDefault()
        break
      case " ":
        openLink()
        e.preventDefault()
        break
    }
  })

  element.querySelector(".title-card button")!.addEventListener("click", () => {
    // TODO: transition effect?
    if (currentActive !== null) {
      currentActive.stop()
    }
    activate()
    currentActive = frame
    element.classList.remove("ready")
  })
}

document
  .querySelectorAll(".demo-frame.ready")
  .forEach((elem) => instrument(elem as HTMLDivElement))

type FrameStatus = "active" | "stopped" | "ready"

let SAMANTHA = speechSynthesis
  .getVoices()
  .filter(({ name }) => name === "Samantha")[0]

speechSynthesis.addEventListener("voiceschanged", () => {
  console.log("voices changed")
  SAMANTHA = speechSynthesis
    .getVoices()
    .filter(({ name }) => name === "Samantha")[0]
})

interface Listeners {
  updateFrameState: (speaking: boolean) => void
  updatePageShown: (pageShown: boolean) => void
  // updateCodeShown: (codeShown: boolean) => void
}

function handleFrame(
  element: HTMLDivElement,
  { updateFrameState, updatePageShown }: Listeners
) {
  let status: FrameStatus = "ready"
  let currentUtterance: SpeechSynthesisUtterance | undefined

  let focusedElem: HTMLElement = document.createElement("div")

  const demoBody = element.querySelector(".demobody")!

  const focus = (focusedElement: Element) => {
    focusedElem.classList.remove("sr-focus")
    focusedElement.classList.add("sr-focus")
    focusedElem = focusedElement as HTMLElement

    const parentRect = demoBody.getBoundingClientRect()
    const parentTop = parentRect.top
    const childRect = focusedElem.getBoundingClientRect()
    const childTop = childRect.top

    const currentScroll = demoBody.scrollTop
    const targetScroll =
      currentScroll +
      (childTop - parentTop) -
      parentRect.height / 2 +
      childRect.height / 2

    demoBody.scrollTo({
      top: Math.max(targetScroll, 0),
      behavior: "smooth",
    })
    readElement(focusedElem)
  }

  const activate = () => {
    element.classList.remove("ready")
    element.classList.add("big")
    element.focus()
    focus(demoBody.children[0] as HTMLElement)
    demoBody.scrollTop = 0
    if (demoBody.classList.contains("default-shown")) {
      demoBody.classList.remove("hidden")
    } else {
      demoBody.classList.add("hidden")
    }
    setTimeout(() => {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }, 300)
    status = "active"
  }

  const updateFrameStateFalse = () => updateFrameState(false)

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = GLOBAL_SETTINGS.rate
    utterance.voice = SAMANTHA
    utterance.addEventListener("start", () => updateFrameState(true))
    utterance.addEventListener("end", updateFrameStateFalse)
    currentUtterance?.removeEventListener("end", updateFrameStateFalse)
    speechSynthesis.cancel()
    currentUtterance = utterance
    speechSynthesis.speak(utterance)
  }

  const readElement = (element: Element) => {
    if (element.tagName === "IMG") {
      const img = element as HTMLImageElement
      if (img.hasAttribute("alt")) {
        if (img.alt.length > 0) {
          console.log("Alt text!")
          speakText("Image: " + img.alt)
        } else {
          console.log("nulled alt!")
        }
      } else {
        const url = new URL(img.src)
        console.log(url.pathname)
        speakText("Image: " + url.pathname)
      }
    } else if (element.tagName.match(/H\d/)) {
      speakText(`Heading Level ${element.tagName[1]}: ` + element.textContent)
    } else if (element.tagName === "A") {
      speakText("Link: " + element.textContent)
    } else {
      speakText(element.textContent ?? "")
    }
  }

  const faster = () => {
    GLOBAL_SETTINGS.rate = Math.min(
      2,
      Math.round((GLOBAL_SETTINGS.rate + 0.1) * 10) / 10
    )
    speakText(`${Math.floor(GLOBAL_SETTINGS.rate * 100)}%`)
  }

  const slower = () => {
    GLOBAL_SETTINGS.rate = Math.max(
      0.1,
      Math.round((GLOBAL_SETTINGS.rate - 0.1) * 10) / 10
    )
    speakText(`${Math.floor(GLOBAL_SETTINGS.rate * 100)}%`)
  }

  const next = () => {
    const nextSibling = element.querySelector(
      ".sr-focus~:not(img[alt='']):not(br)"
    )
    if (nextSibling !== null) focus(nextSibling)
    else errorSound()
  }

  const prev = () => {
    const nextSibling = element.querySelector("*:has(+.sr-focus)")
    console.log(nextSibling)
    if (nextSibling !== null) focus(nextSibling)
    else errorSound()
  }

  const stopAudio = () => {
    if (status !== "active") return
    if (!speechSynthesis.speaking) {
      readElement(focusedElem)
    } else {
      speechSynthesis.cancel()
    }
  }

  const stop = () => {
    status = "stopped"
    speechSynthesis.cancel()
    element.classList.add("ready")
    element.classList.remove("big")
  }

  const togglePageVisibility = () => {
    const hidden = element
      .querySelector(".demobody")!
      .classList.toggle("hidden")
    updatePageShown(!hidden)
  }

  const getCurrentStatus = () => {
    return status
  }

  const rotor = (regex: RegExp) => (direction: "forward" | "back") => {
    const allDemoElems = Array.from(demoBody.querySelectorAll("*"))

    const focusedIndex = allDemoElems.findIndex((elem) => {
      return elem.isSameNode(focusedElem)
    })

    if (direction === "forward") {
      const nextRotorTarget = allDemoElems.find((elem, index) => {
        return elem.tagName.match(regex) && index > focusedIndex
      })

      if (nextRotorTarget !== undefined) {
        focus(nextRotorTarget)
      } else {
        errorSound()
      }
    } else {
      console.log("back")
      const prevRotorTarget = allDemoElems.reverse().find((elem, index) => {
        return (
          elem.tagName.match(regex) &&
          index > allDemoElems.length - focusedIndex
        )
      })

      if (prevRotorTarget !== undefined) {
        focus(prevRotorTarget)
      } else {
        errorSound()
      }
    }
  }

  const headerRotor = rotor(/^H\d$/)
  const linkRotor = rotor(/^A$/)

  const errorSound = () => {
    new Audio("/Tink.wav").play()
  }

  const openLink = () => {
    if (focusedElem.tagName === "A") {
      const href = (focusedElem as HTMLAnchorElement).href
      const domain = new URL(href).hostname
      speakText("Opening: " + domain)
      window.open(href, "_blank")
    } else {
      errorSound()
    }
  }

  return {
    activate,
    stop,
    next,
    prev,
    stopAudio,
    faster,
    slower,
    getCurrentStatus,
    togglePageVisibility,
    headerRotor,
    openLink,
    linkRotor,
    // toggleCodeVisibility,
  }
}
