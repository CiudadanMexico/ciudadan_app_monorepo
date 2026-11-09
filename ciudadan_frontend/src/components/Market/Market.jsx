import React from 'react';
import '../../styles/Market.css';

const categories = [
    { name: 'Electrónica', icon: '📱' },
    { name: 'Ropa', icon: '👕' },
    { name: 'Hogar', icon: '🏠' },
    
    { name: 'Belleza', icon: '💄' },
    { name: 'Deportes', icon: '🏋️‍♂️' },
    { name: 'Juegos', icon: '🎮' },
    { name: 'Libros', icon: '📚' },
];

const products = [
    { name: 'Smartphone XYZ', price: '$599.99', rating: 4.5, reviews: 120, icon: '📱' },
    { name: 'Camiseta Casual', price: '$24.99', rating: 4.2, reviews: 85, icon: '👕' },
    { name: 'Set de Cocina Premium', price: '$149.99', rating: 4.7, reviews: 210, icon: '🔍' },
    { name: 'Auriculares Inalámbricos', price: '$79.99', rating: 4.3, reviews: 156, icon: '🎧' },
];

const Market = () => {
    return (
        <div className="market-container">
            <div className="market">

            

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

                <div className="products-grid">
                    {products.map((product, index) => (
                        <div key={index} className="product-card">
                            <div className="icon">{product.icon}</div>
                            <p>{product.name}</p>
                            <p>{product.price}</p>
                            <p>{'⭐'.repeat(Math.round(product.rating))} ({product.reviews})</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Market;
