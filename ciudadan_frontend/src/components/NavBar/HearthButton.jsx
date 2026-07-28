// CartIcon.jsx
import { MdFavorite } from "react-icons/md";import { useNavigate } from "react-router-dom";
import "../../styles/MessagesIcon.css";

const HearthButton = () => {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate("/favoritos");
  };

  return (
    <div className="message-icon-container" onClick={handleClick}>
      <MdFavorite className="message-icon" />
    </div>
  );
};

export default HearthButton;
