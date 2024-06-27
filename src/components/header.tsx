import { ConnectButton } from '@rainbow-me/rainbowkit';

const Header = () => {
  return (
    <nav className="py-4 flex justify-between items-center z-10">
      <a href="/">
        <img src="/spectral.svg" alt="spectral logo" className="w-32 md:w-full" />
      </a>

      <ConnectButton label="Connect" />
    </nav>
  );
};

export default Header;
