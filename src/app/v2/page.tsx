import Image from 'next/image';
import localFont from 'next/font/local';

const monoStyle = {
  fontFamily: 'Monaco, Menlo, "Courier New", monospace'
} as const;

const productLinkClassName = 'no-underline hover:underline hover:text-white';

const safiroMedium = localFont({
  src: '../../../public/vscode-v2/fonts/safiro-medium.otf',
  display: 'swap'
});

export default function LandingPage() {
  return (
    <div className="max-w-5xl">
      <h1
        aria-label="Shirtless Founder"
        className={`${safiroMedium.className} inline-flex items-center gap-[0.2em] text-3xl md:text-7xl font-normal leading-none`}
      >
        <span>Shirtless</span>
        <span>Founder</span>
        <span className="relative inline-block h-7 w-7 md:h-16 md:w-16 shrink-0 overflow-hidden rounded-full">
          <Image
            src="/vscode-v2/images/shirtless-founder-avatar.jpeg"
            alt="Shirtless Founder portrait"
            fill
            priority
            sizes="64px"
            className="object-cover object-center"
          />
        </span>
      </h1>
      <p className="mt-7 text-[14px] text-gray-500" style={monoStyle}>{'//'}Mission</p>
      <p className="mt-1 text-[14px] text-gray-300" style={monoStyle}>We&apos;re building the infrastructure that captures who a specific person is and injects that representation into AI systems, so that AI will act on their behalf to extend them.</p>
      <p className="mt-[26px] text-[14px] text-gray-500" style={monoStyle}>{'//'}Try out and <a href="https://t.me/shirtlessfounder" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>ask me</a> about any of these highlighted projects (all other projects are on the left sidebar)</p>
      <p className="mt-0.5 text-[14px] text-gray-300" style={monoStyle}>Product | One-liner | Links</p>
      <p className="mt-0.5 text-[14px] text-gray-300" style={monoStyle}>--- | --- | ---</p>
      <p className="mt-1 text-[14px] text-gray-300" style={monoStyle}>talk-to-my-agent | ask my agent questions about what it&apos;s up to or vibe with its personality | <a href="https://t.me/shirtlessfounder" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>[telegram]</a></p>
      <p className="mt-1 text-[14px] text-gray-300" style={monoStyle}>auto-biographer | an agent that follows what you&apos;re thinking, doing and shipping and posts about it | <a href="https://github.com/shirtlessfounder/auto-biographer" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>[github]</a></p>
      <p className="mt-1 text-[14px] text-gray-300" style={monoStyle}>slate-agent | a proactive, digitally embodied hermes agent fork with access to in-network messaging | <a href="https://slate-sal.exe.xyz/hermes-provisioner/" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>[launch]</a> <a href="https://github.com/handsdiff/activeclaw" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>[github]</a></p>
      <p className="mt-1 text-[14px] text-gray-300" style={monoStyle}>innies | pool your (and your friends&apos;) tokens into one key for extended claude/codex usage capacity | <a href="https://innies.computer" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>[website]</a> <a href="https://github.com/shirtlessfounder/innies" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>[github]</a></p>
      <p className="mt-1 text-[14px] text-gray-300" style={monoStyle}>agentmeets | create DM chat room with invite links for any two agents | <a href="https://innies.live" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>[website]</a> <a href="https://github.com/alexjaniak/AgentMeets" target="_blank" rel="noopener noreferrer" className={productLinkClassName}>[github]</a></p>
    </div>
  );
}
