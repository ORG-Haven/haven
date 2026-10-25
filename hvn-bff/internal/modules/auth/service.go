package auth

type Service struct {
}

func NewService() (*Service, error) {
	return &Service{}, nil
}

func (s *Service) AppSignUp(user UserCreateReq) {

}
