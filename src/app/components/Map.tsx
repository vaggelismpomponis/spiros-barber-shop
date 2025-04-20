'use client'

const Map = () => {
  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-md">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3074.7111742252697!2d22.417166!3d39.635860!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x135881217fd4e4e1%3A0x0!2zS29yYcOtIDE3LCBMw6FyaXNhIDQxMjIz!5e0!3m2!1sen!2sgr!4v1650000000000!5m2!1sen!2sgr"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen={true}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}

export default Map 