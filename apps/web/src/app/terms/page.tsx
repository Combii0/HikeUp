export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050915] text-slate-200 px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold text-orange-400">
          Términos y Condiciones
        </h1>

        <p>
          Al crear una cuenta en HikeUp, aceptas el tratamiento de tus datos
          personales con fines exclusivos de funcionamiento de la plataforma,
          personalización de rutas y mejora del servicio.
        </p>

        <h2 className="text-xl font-semibold">Datos que recopilamos</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Nombre real</li>
          <li>Nombre de usuario</li>
          <li>Correo electrónico</li>
          <li>Información relacionada con tus rutas y actividad</li>
        </ul>

        <h2 className="text-xl font-semibold">Uso de la información</h2>
        <p>
          Esta información se utiliza únicamente para ofrecer funcionalidades
          dentro de la aplicación. No compartimos tus datos con terceros.
        </p>

        <h2 className="text-xl font-semibold">Seguridad</h2>
        <p>
          Implementamos medidas de seguridad para proteger tu información, pero
          el usuario es responsable de mantener la confidencialidad de su
          contraseña.
        </p>

        <h2 className="text-xl font-semibold">Aceptación</h2>
        <p>
          Al registrarte, confirmas que has leído y aceptado estos términos.
        </p>
      </div>
    </div>
  );
}
