import { Outlet } from 'react-router-dom';
import Header from '../components/header';
import bgImage from '../assets/images/bg.jpg';

const AppLayout = () => (
  <main style={{ backgroundImage: `url(${bgImage})` }} className="bg-cover bg-center">
    <div className="min-h-screen container">
      <Header />
      <Outlet />
    </div>
  </main>
);

export default AppLayout;
