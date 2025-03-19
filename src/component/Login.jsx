

export default function Login() {
    

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-4xl bg-white shadow-lg flex">
          {/* Left Section (Login Form) */}
          <div className="w-1/2 p-8">
            <h2 className="text-2xl font-bold mb-6">Login</h2>
  
            <form  className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  
                  
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="username@gmail.com"
                />
              </div>
  
              <div>
                <label className="block text-sm font-medium">Password</label>
                <div className="relative">
                  <input
                    
                    required
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="********"
                  />
                  <button
                    type="button"
                    
                    className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                  >
                    
                  </button>
                </div>
              </div>
  
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    
                   
                    className="mr-2"
                  />
                  Remember Me
                </label>
                <a href="#" className="text-sm text-blue-600 hover:underline">
                  Forgot Password?
                </a>
              </div>
  
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Login
              </button>
            </form>
          </div>
  
          {/* Right Section (Welcome Message) */}
          <div  className="w-1/2 flex flex-col items-center justify-center p-6 bg-[url('/src/assets/bg-JuanLMS.svg')] bg-cover bg-center " >
            <h2 className="text-2xl font-bold font-poppinsb text-white">Hello, welcome!</h2>
            <p className="text-sm mt-2 text-center font-poppinsl text-white">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
          </div>
        </div>
      </div>
    );
}

