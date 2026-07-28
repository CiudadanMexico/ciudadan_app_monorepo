// utils/user.jsx
import axios from 'axios';

export const fetchUserId = async (user, isAuthenticated, setUserId) => {
  if (isAuthenticated && user?.email) {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_STRAPI_URL}/api/users`,
        {
          params: { 'filters[email]': user.email },
        }
      );
      if (response.data.length > 0) {
        setUserId(response.data[0].id);
        console.log('User ID from Strapi:', response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching user ID from Strapi:', error);
    }
  }
};
