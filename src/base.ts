import proxy from "proxy-agent";
import fetch from "node-fetch";
import {JSDOM} from "jsdom"
export function version(): string {
  return "0.0.3"
}
export class OpenAI {
  private email: string;
  private password: string;
  private proxy: string;
  private debug: boolean;
  constructor(email: string, password: string, proxy: string, debug: boolean) {
    if (!email || !password) {
      throw new Error("email and password are required");
    }
    this.email = email;
    this.password = password;
    this.proxy = proxy;
    this.debug = debug ? true : false;
  }
  private log = (message: string) => {
    if (this.debug) {
      console.log(message);
    }
  }
  public async login(): Promise<string> {
    this.log(`Provided details: email: ${this.email}, password: ${this.password}, proxy: ${this.proxy}`)
    const proxyAgent = this.proxy ? new proxy(this.proxy) : undefined;

    this.log("Beginning login process...")
    this.log("Making request to https://chat.openai.com/auth/login")
    const firstResponse = await fetch("https://chat.openai.com/auth/login",{
      headers: {
        "Host": "ask.openai.com",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    },
    agent: proxyAgent
    })
    if (firstResponse.status !== 200) {
      throw new Error("Unable to login, first request failed please try that again")
    }
    this.log("Beginning Part 2 of login process...")
    this.log("Making request to https://chat.openai.com/auth/csrf")
    const secondResponse = await fetch("https://chat.openai.com/auth/csrf",{
      headers: {
        "Host": "ask.openai.com",
        "Accept": "*/*",
        "Connection": "keep-alive",
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
        "Referer": "https://chat.openai.com/auth/login",
        "Accept-Encoding": "gzip, deflate, br",
    },
    agent: proxyAgent
    })
    if (secondResponse.status !== 200 || !secondResponse.headers.get("content-type")?.includes("json")) {
      throw new Error("Unable to login, second request failed please try that again")
    }
    const secondResponseJSON = await secondResponse.json() as { csrf: string|undefined }
    if (!secondResponseJSON.csrf) {
      throw new Error("Unable to login, second request failed please try that again")
    }
    const csrf = secondResponseJSON.csrf
    this.log(`CSRF Token: ${csrf}`)
    this.log("Beginning Part 3 of login process...")
    this.log("Making request to https://chat.openai.com/api/auth/signin/auth0?prompt=login")
    const thirdResponse = await fetch("https://chat.openai.com/api/auth/signin/auth0?prompt=login",{
      method: "POST",
      headers: {
        'Host': 'ask.openai.com',
        'Origin': 'https://chat.openai.com',
        'Connection': 'keep-alive',
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        'Referer': 'https://chat.openai.com/auth/login',
        'Content-Length': '100',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    agent: proxyAgent,
    body:`callbackUrl=%2F&csrfToken=${csrf}&json=true`
    })
    if (!thirdResponse.headers.get("content-type")?.includes("json")) {
      throw new Error("Unable to login, third request failed please try that again")
    }
    const thirdResponseJSON = await thirdResponse.json() as {
      url: string
    }
    const url = thirdResponseJSON.url
    if (url == "https://chat.openai.com/api/auth/error?error=OAuthSignin" || url.includes("error")) {
      throw new Error("You Have Been Rate Limited, Please Try Again Later")
    }
    this.log(`Callback URL: ${url}`)
    if (thirdResponse.status == 400) {
      throw new Error(`Bad request from your ip address,
please try again`)
    }
    if (thirdResponse.status !== 200) {
      throw new Error("Unable to login, third request failed please try that again")
    }
    this.log("Beginning Part 4 of login process...")
    this.log(`Making request to ${url}`)
    const fourthResponse = await fetch(url,{
      headers:{
        'Host': 'auth0.openai.com',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://chat.openai.com/',
    },
    redirect:"manual",
    agent: proxyAgent
    })
    if (fourthResponse.status !== 302) {
      throw new Error("Unable to login, fourth request failed please try that again")
    }
    let state = await fourthResponse.text()
    const stateReg = state.matchAll(/state=(.*)/g)
    state = stateReg[0].toString().split('"')[0]
    this.log(`State: ${state}`)
    this.log("Beginning Part 5 of login process...")
    this.log(`https://auth0.openai.com/u/login/identifier?state=${state}`)
    const fifthResponse = await fetch(`https://auth0.openai.com/u/login/identifier?state=${state}`,{
      method:"GET",
      headers:{
        'Host': 'auth0.openai.com',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://chat.openai.com/',
    },
    agent: proxyAgent
    })
    if (fifthResponse.status !== 200) {
      throw new Error("Unable to login, fifth request failed please try that again")
    }
    const fifthResponseText = await fifthResponse.text()
    const dom = new JSDOM(fifthResponseText)
    // Search for a image with alt text "Captcha"

    const captcha = dom.window.document.querySelector("img[alt='Captcha']")
    let capthaRes: string|undefined
    if (captcha) {
      this.log("Captcha Found")
      const captchaURL = captcha.getAttribute("src")
      if (captchaURL) {
        this.log(`Captcha URL: ${captchaURL}`)
        this.log("Please solve the captcha and then press enter")
        capthaRes = await new Promise<string>((resolve) => {
          process.stdin.once("data", (data) => {
            resolve(data.toString())
          })
        })
      }
      else {
        throw new Error("Unable to login, captcha url not found")
      }
    }
    else {
      this.log("Captcha Not Found")
    }
    this.log("Beginning Part 6 of login process...")
    this.log(`Making request to https://auth0.openai.com/u/login/identifier?state=${state}`)
    let payload;
    if (!capthaRes) {
      payload = `state=${state}&username=${encodeURIComponent(this.email)}&js-available=false&webauthn-available=true&is-brave=false&webauthn-platform-available=true&action=default`
    }
    else {
      payload = `state=${state}&username=${encodeURIComponent(this.email)}&captcha=${capthaRes}&js-available=true&webauthn-available=true&is-brave=false&webauthn-platform-available=true&action=default`
    const sixthResponse = await fetch(`https://auth0.openai.com/u/login/identifier?state=${state}`,{
      method:"POST",
      headers:{
        'Host': 'auth0.openai.com',
        'Origin': 'https://auth0.openai.com',
        'Connection': 'keep-alive',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
        'Referer': `https://auth0.openai.com/u/login/identifier?state=${state}`,
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
    redirect:"manual",
    agent: proxyAgent
    })
    if (sixthResponse.status !== 302) {
      throw new Error("Email not found, Check your email address and try again!")
    }
    this.log("Beginning Part 7 of login process...")
    this.log("Entering password...")
    this.log(`Making request to https://auth0.openai.com/u/login/password?state=${state}`)
    


}