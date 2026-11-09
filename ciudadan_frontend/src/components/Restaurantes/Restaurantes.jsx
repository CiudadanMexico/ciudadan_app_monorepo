import React from 'react';
import '../../styles/Restaurantes.css';

const categories = [
    { name: 'Pizzas', icon: '🍕' },
    { name: 'Hamburguesas', icon: '🍔' },
    { name: 'Sushi', icon: '🍣' },
    { name: 'Tacos', icon: '🌮' },
    { name: 'Pasta', icon: '🍝' },
    { name: 'Ensaladas', icon: '🥗' },
    { name: 'Carnes', icon: '🍖' }
];

const restaurants = [
    { name: 'La Pizzería Deliciosa', icon: '🍕' },
    { name: 'Burger Palace', icon: '🍔' },
    { name: 'Sushi Express', icon: '🍣' }
];

const Restaurantes = () => {
    return (
        <div className="explora-opciones2">
            <h2>Explora Deliciosas Opciones</h2>
            <div className="categories-slider">
                <div className="categories">
                    {categories.map((category, index) => (
                        <div key={index} className="category">
                            <div className="icon">{category.icon}</div>
                            <p>{category.name}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="restaurants">
                {restaurants.map((restaurant, index) => (
                    <div key={index} className="restaurant">
                        <div className="icon">{restaurant.icon}</div>
                        <p>{restaurant.name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Restaurantes;
