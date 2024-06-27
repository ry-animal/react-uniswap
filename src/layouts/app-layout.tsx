import { Outlet } from 'react-router-dom';
import Header from '../components/header';

const AppLayout = () => (
  <main className="bg-[url(bg.jpg)] bg-cover bg-center">
    <div className="min-h-screen container">
      <Header />
      <Outlet />
    </div>
  </main>
);

export default AppLayout;
