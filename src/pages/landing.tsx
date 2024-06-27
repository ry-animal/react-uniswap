import SwapCard from '../components/swap-card';

const Landing = () => {
  return (
    <div className="flex flex-col items-center gap-4 z-10">
      <div className="text-4xl md:text-6xl pt-10 text-syntax font-chakra text-center">Spectral Swapper</div>

      <div className="text-xl md:text-2xl text-center text-white font-chakra">
        A simple interface for swapping tokens on various chains.
      </div>

      <div className="text-xs md:text-sm text-center text-white font-chakra pb-10">
        Powered by{' '}
        <a
          href="
        https://uniswap.org/"
          target="_blank"
          rel="noreferrer"
        >
          <img src="uniswap.svg" alt="Uniswap" className="inline-block size-8 mb-2" />
        </a>
      </div>

      <SwapCard />
    </div>
  );
};

export default Landing;
