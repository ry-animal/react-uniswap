import { Github, CameraIcon } from 'lucide-react';

const Footer = () => {
  return (
    <div className="flex fixed bottom-4 left-1/2 -translate-x-1/2 w-full justify-between font-chakra text-xs md:text-sm">
      <span className="flex ml-8 gap-1">
        <span>created by</span>
        <a
          href="https://www.freepik.com/free-vector/abstract-technological-background_13182208.htm#query=blockchain%20background&position=0&from_view=keyword&track=ais_user&uuid=ceec5fd7-59eb-44f0-a6d1-263b52f500ea"
          className="flex gap-1"
          target="_blank"
          rel="noreferrer noopenner"
        >
          ry-animal
          <Github size={16} className="inline-block mb-2" />
        </a>
      </span>
      <span className="flex mr-8 gap-1">
        <span>Background by </span>
        <a
          href="https://www.freepik.com/free-vector/abstract-technological-background_13182208.htm#query=blockchain%20background&position=0&from_view=keyword&track=ais_user&uuid=ceec5fd7-59eb-44f0-a6d1-263b52f500ea"
          className="flex gap-1"
          target="_blank"
          rel="noreferrer noopenner"
        >
          Freepik
          <CameraIcon size={16} />
        </a>
      </span>
    </div>
  );
};

export default Footer;
